#! /bin/bash

# Navigate to the project directory
# get name split of current directory
PARENT_DIR_NAME=$(basename "$(dirname "$PWD")")


if [ $PARENT_DIR_NAME != "vps" ]; then
    if [ ! -d "../../vps/peninei" ]; then
        echo "Error: Directory ../../vps/peninei does not exist."
        exit 1
    fi
    cd ../../vps/peninei
fi

echo "Updating repository..."
git pull origin main
git checkout main

# Ask the user what to deploy
echo "What would you like to deploy?"
echo "1) Backend"
echo "2) Frontend"
echo "3) Both (default)"
read -p "Enter your choice [1-3]: " choice

# Default to deploying both if no input is provided
choice=${choice:-3}

case $choice in
    1)
        echo "Deploying backend to live environment..."
        docker compose -f docker-compose.yml up -d --build backend
        ;;
    2)
        echo "Deploying frontend to live environment..."
        docker compose -f docker-compose.yml up -d --build frontend
        ;;
    3)
        echo "Deploying both backend and frontend to live environment..."
        docker compose -f docker-compose.yml up -d --build
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo "Deployment to live environment completed. Make sure you copy the environment variables from staging."