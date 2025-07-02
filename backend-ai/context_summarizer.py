from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline  # type: ignore
import io
import PyPDF2
import math

# Load the models
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
gen_qa = pipeline("text2text-generation", model="google/flan-t5-base", max_length=1024)

# FastAPI app setup
app = FastAPI()

# Allow frontend requests (adjust origins in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

qa_pipeline = pipeline("question-answering", model="deepset/roberta-base-squad2")

# Define request body model
class QARequest(BaseModel):
    prompt: str

class SummarizeRequest(BaseModel):
    text: str

# Route: POST /generate
@app.post("/generate")
async def generate_response(data: QARequest):
    prompt = data.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    # Try to parse context and question
    context = None
    question = None
    for line in prompt.splitlines():
        if line.lower().startswith("context:"):
            context = line[len("context:"):].strip()
        elif line.lower().startswith("question:"):
            question = line[len("question:"):].strip()
    if not context or not question:
        raise HTTPException(status_code=400, detail="Prompt must include 'Context:' and 'Question:' lines.")

    try:
        result = qa_pipeline(question=question, context=context)
        answer = result.get("answer", "") if isinstance(result, dict) else ""
        return {"result": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model error: {str(e)}")

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if file.content_type == "text/plain":
        text = (await file.read()).decode("utf-8")
        return {"text": text}
    elif file.content_type == "application/pdf":
        pdf_bytes = await file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
        text = "\n".join(page.extract_text() or '' for page in pdf_reader.pages)
        return {"text": text}
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Only PDF and TXT are allowed.")

@app.post("/summarize")
async def summarize_text(data: SummarizeRequest):
    text = data.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    try:
        # BART can handle up to ~1024 tokens (about 1024-2048 characters)
        max_chunk_size = 1024  # characters, not tokens, but a rough proxy
        overlap = 100  # overlap to avoid cutting sentences
        summaries = []
        start = 0
        while start < len(text):
            end = min(start + max_chunk_size, len(text))
            # Try to end at a sentence boundary
            if end < len(text):
                period_pos = text.rfind('.', start, end)
                if period_pos != -1 and period_pos > start:
                    end = period_pos + 1
            chunk = text[start:end].strip()
            if chunk:
                chunk_len = len(chunk.split())
                # Dynamically set max_length and min_length, ensuring max_length <= chunk_len
                if chunk_len < 50:
                    desired_max = max(5, int(chunk_len * 0.6))
                    desired_min = max(1, int(chunk_len * 0.2))
                else:
                    desired_max = 120
                    desired_min = 30
                max_len = min(desired_max, chunk_len)
                min_len = min(desired_min, max_len - 1, chunk_len - 1) if max_len > 1 else 1
                summary = summarizer(chunk, max_length=max_len, min_length=min_len, do_sample=False)
                summaries.append(summary[0]['summary_text'])
            start = end - overlap  # overlap to keep context
            if start < 0:
                start = 0
        # If multiple summaries, summarize them together for a brief summary
        if len(summaries) > 1:
            combined = " ".join(summaries)
            final_summary = summarizer(combined, max_length=150, min_length=40, do_sample=False)[0]['summary_text']
        else:
            final_summary = summaries[0] if summaries else ""
        return {"summary": final_summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization error: {str(e)}")
