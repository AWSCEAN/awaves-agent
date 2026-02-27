FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY pyproject.toml .
RUN pip install --no-cache-dir .

# Copy application code
COPY app ./app

# Download AWS RDS global CA bundle — required for Aurora SSL verify-full
RUN mkdir -p /certs && \
    curl -sS https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
    -o /certs/global-bundle.pem

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app /certs
USER appuser

# Expose port
EXPOSE 8001

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
