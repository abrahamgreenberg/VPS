echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env && tail -n 5 .env
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env && tail -n 5 .env