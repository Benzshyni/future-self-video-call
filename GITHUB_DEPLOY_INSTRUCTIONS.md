# GitHub Actions Deployment

This project is configured to deploy to **GitHub Pages** automatically when you push to the `main` branch.

## Setup Instructions

1. **GitHub Pages Configuration**:
   - Go to your repository settings on GitHub.
   - Navigate to **Pages**.
   - Under **Build and deployment** > **Source**, select **GitHub Actions**.

2. **GitHub Secrets**:
   - Go to your repository settings on GitHub.
   - Navigate to **Secrets and variables** > **Actions**.
   - Add a new repository secret:
     - Name: `GEMINI_API_KEY`
     - Value: Your Gemini API key.

## Workflows

- **CI**: Runs on every push and pull request to ensure the code passes linting.
- **Deploy to GitHub Pages**: Builds the application and deploys it to GitHub Pages on every push to `main`.
