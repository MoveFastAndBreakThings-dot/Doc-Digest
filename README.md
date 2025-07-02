# DocDigest

![Screenshot 2025-05-28 152129](https://github.com/user-attachments/assets/c3be93af-6839-429a-b2ac-0d3986cd1f55)
![Screenshot 2025-05-28 152142](https://github.com/user-attachments/assets/55f0e416-f73a-487a-a289-a0baaf96bc9a)

---

## Overview

**DocDigest** is an intelligent document question-answering and summarization web app built with HuggingFace Transformers and Gradio. It allows users to upload PDFs or TXT files—or paste any text—and ask specific questions related to the content. The app uses state-of-the-art transformer models to extract precise answers, effectively summarizing the context based on the user’s queries.

This project demonstrates how transformer-based NLP models like BERT and RoBERTa can be leveraged for document understanding, enabling focused information retrieval and contextual summarization through a simple, user-friendly interface.

---

## Features

- 📄 Upload PDF or TXT files to extract and process text automatically  
- 📝 Paste any text context to ask questions without uploading  
- ❓ Answer specific questions related to the uploaded or pasted text using a powerful question-answering model  
- ⚡ Responsive and clean UI built with Gradio for fast interaction  
- 🔧 Handles long documents with preprocessing and text cleaning  
- 🔒 Fully client-server based with no external dependencies on user data

---

## How It Works

1. User uploads a document or pastes text.  
2. The app extracts and cleans the text content.  
3. User inputs a question related to the text.  
4. The transformer QA model processes the question-context pair to generate an accurate answer.  
5. The answer is displayed with a confidence score.

---

## Installation & Usage

1. Clone this repo:  
   ```bash
   git clone https://github.com/yourusername/DocDigest.git
   cd DocDigest
   pip install -r requirements.txt
Dependencies
Python 3.8+

transformers

gradio

PyMuPDF (fitz)

regex (for text cleaning)

Model Details
This project uses the deepset/roberta-base-squad2 model from HuggingFace — a fine-tuned RoBERTa model optimized for extractive question answering on SQuAD 2.0, providing strong performance in answering questions based on given text contexts.
