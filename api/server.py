import logging
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.middleware.trustedhost import TrustedHostMiddleware

from . import inference

app = FastAPI(title="Virtual Quiz Bowl local AI", docs_url=None, redoc_url=None)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost", "[::1]"])
MAX_UPLOAD = 2 * 1024 * 1024


@app.middleware("http")
async def local_browser(request: Request, call_next):
    origin = request.headers.get("origin")
    if origin and origin not in {"http://127.0.0.1:52741", "http://127.0.0.1:52742",
                                 "http://localhost:52741", "http://localhost:52742"}:
        return JSONResponse({"detail": "Open the game on its local address."}, status_code=403)
    size = request.headers.get("content-length", "")
    if size.isdecimal() and int(size) > MAX_UPLOAD + 256 * 1024:
        return JSONResponse({"detail": "Recording exceeds the upload limit."}, status_code=413)
    return await call_next(request)


@app.exception_handler(inference.NotReady)
async def dependency_error(request: Request, exc: inference.NotReady):
    logging.getLogger("uvicorn.error").warning("Local inference unavailable: %s (%s)", exc, type(exc.__cause__).__name__)
    return JSONResponse({"detail": str(exc)}, status_code=503)


@app.get("/api/ready")
def ready():
    inference.ready()
    return {"whisper": inference.WHISPER_MODEL, "device": "cuda", "judge": inference.OLLAMA_MODEL}


@app.post("/api/answers", response_model=inference.Verdict)
def grade(clip: Annotated[UploadFile, File()], key: Annotated[str, Form()]):
    try:
        question = inference.Key.model_validate_json(key)
    except ValidationError as exc:
        raise HTTPException(422, "Invalid trivia answer key.") from exc
    data = clip.file.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        raise HTTPException(413, "Recording exceeds the upload limit.")
    try:
        transcript = inference.transcribe(data)
    except inference.BadClip as exc:
        raise HTTPException(422, str(exc)) from exc
    return inference.judge(question, transcript)
