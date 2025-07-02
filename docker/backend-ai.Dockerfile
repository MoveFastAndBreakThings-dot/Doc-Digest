# Use official Python image
FROM python:3.10-slim

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        libglib2.0-0 \
        libsm6 \
        libxrender1 \
        libxext6 \
        git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY ../backend-ai/context_summarizer.py ./
COPY ../backend-ai/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE 8000

# Run the FastAPI app
CMD ["uvicorn", "context_summarizer:app", "--host", "0.0.0.0", "--port", "8000"]
