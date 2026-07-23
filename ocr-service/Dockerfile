FROM python:3.10-slim-bullseye

WORKDIR /svc

# System libs opencv (pulled in by easyocr) needs at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only torch FIRST so easyocr doesn't drag in the ~2GB CUDA build.
RUN pip install --no-cache-dir \
        torch==2.3.1 torchvision==0.18.1 \
        --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# Pre-download the Vietnamese detection + recognition models at build time so the
# running container never needs internet.
RUN python -c "import easyocr; easyocr.Reader(['vi'], gpu=False)"

EXPOSE 8868
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8868"]
