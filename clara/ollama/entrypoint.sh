#!/bin/bash
# Clara Ollama Model Automatic Downloader
set -e

# Start Ollama server in the background
ollama serve &

# Wait for the server to be healthy
echo "Waiting for Ollama server to be healthy..."
until curl -s http://localhost:11434/api/tags > /dev/null; do
  sleep 2
done

# Pull the model requested or fall back to llama3.1:8b
MODEL=${OLLAMA_MODEL:-"llama3.1:8b"}
echo "Pulling model: $MODEL"
ollama pull $MODEL

echo "Model pulled successfully. Keeping the server running in the foreground."
# Wait for the background process (ollama serve) to finish
# (which it shouldn't unless killed)
wait
