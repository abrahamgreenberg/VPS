#!/bin/bash

set -e  # Exit on error

# Check if directory name is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <directory-name>"
    echo "Example: $0 app1"
    exit 1
fi

DIR_NAME="$1"
BACKUP_NAME="${DIR_NAME}_bak"

# Check if source directory exists
if [ ! -d "../${DIR_NAME}" ]; then
    echo "Error: Directory ../${DIR_NAME} does not exist"
    exit 1
fi

echo "Merging ${DIR_NAME} into vps..."

cd ..

# Create backup
echo "Creating backup: ${BACKUP_NAME}"
mv "${DIR_NAME}" "${BACKUP_NAME}"

# Clone the backup
echo "Cloning repository..."
git clone --no-local "${BACKUP_NAME}" "${DIR_NAME}"

# Filter repo to move everything into a subdirectory
cd "${DIR_NAME}"
echo "Filtering repository history..."
git filter-repo --to-subdirectory-filter "${DIR_NAME}"

# Go to vps and merge
cd ../vps

echo "Adding remote and fetching..."
git remote add "${DIR_NAME}" "../${DIR_NAME}"
git fetch "${DIR_NAME}"

echo "Merging into vps..."
git merge --allow-unrelated-histories "${DIR_NAME}/main" -m "Import ${DIR_NAME} repo"

# Cleanup
git remote remove "${DIR_NAME}"
cd ..
rm -rf "${DIR_NAME}"

echo "✅ Successfully merged ${DIR_NAME} into vps!"
echo "Backup is available at: ${BACKUP_NAME}"
