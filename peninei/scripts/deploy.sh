
echo "Where would you like to deploy?"
echo "1) Live"
echo "2) Staging (default)"
read -p "Enter your choice [1-2]: " choice

# Default to staging if no input is provided
choice=${choice:-2}

case $choice in
    1)
        ./scripts/deploy_live.sh
        ;;
    2)
        ./scripts/deploy_staging.sh
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac
