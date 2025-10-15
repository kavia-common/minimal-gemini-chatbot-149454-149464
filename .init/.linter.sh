#!/bin/bash
cd /home/kavia/workspace/code-generation/minimal-gemini-chatbot-149454-149464/reactjs_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

