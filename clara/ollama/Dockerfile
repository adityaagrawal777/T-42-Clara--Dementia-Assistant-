# Clara Ollama Dockerfile
FROM ollama/ollama:latest

# Copy the custom entrypoint script
COPY ./entrypoint.sh /entrypoint.sh

# Make sure the script is executable
RUN chmod +x /entrypoint.sh

# Expose the default Ollama port
EXPOSE 11434

# Use the custom entrypoint to automatically pull models on startup
ENTRYPOINT ["/entrypoint.sh"]
