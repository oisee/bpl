# Build Instructions for BPL (BPMN-lite Parser)

This document provides comprehensive build instructions for the BPL (BPMN-lite Parser) project, including detailed steps for different environments and deployment options.

## Prerequisites

### Required Software

- **Node.js**: Version 14.x or later
  - Download from https://nodejs.org/
  - Verify with: `node --version`

- **npm**: Version 6.x or later (usually comes with Node.js)
  - Verify with: `npm --version`

- **Python**: Version 3.6 or later (required for Visio export functionality)
  - Download from https://www.python.org/downloads/
  - Verify with: `python --version` or `python3 --version`

### Python Dependencies

The following Python packages are required for the Visio export functionality:

- pandas (>= 1.5.0)
- openpyxl (>= 3.0.0)
- numpy (>= 1.20.0)

## Standard Build Process

### 1. Clone the Repository

```bash
git clone <repository-url>
cd bpl
```

### 2. Install Node.js Dependencies

```bash
npm install
```

This installs all required JavaScript dependencies defined in `package.json`.

### 3. Install Python Dependencies

```bash
# Using pip
pip install -r tools/requirements.txt

# Or with pip3 if you have multiple Python versions
pip3 install -r tools/requirements.txt
```

### 4. Build the Project

```bash
npm run build
```

This executes the `build.js` script, which:

1. Creates the `dist` directory if it doesn't exist
2. Creates subdirectories for tools and samples
3. Copies the HTML files from `src` to `dist`
4. Copies the Python tools for Visio export
5. Copies sample files
6. Creates a server-helper.js for NodeJS integration

### 5. Test the Build

```bash
npm start
```

This starts an HTTP server on the `dist` directory and opens the application in your default browser.

## Build for Production

For a production-ready build:

1. Follow steps 1-4 from the standard build process

2. Deploy the contents of the `dist` directory to your web server

3. For the Visio export functionality to work in production:
   - Ensure Python 3.6+ is installed on the server
   - Install the required Python dependencies
   - Configure the server to allow executing the Python script

## Docker Build

### Creating a Docker Image

1. Create a Dockerfile (if not already present):

```docker
FROM node:16-alpine

# Install Python and pip
RUN apk add --no-cache python3 py3-pip

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy Python requirements
COPY tools/requirements.txt ./tools/

# Install Python dependencies
RUN pip3 install -r tools/requirements.txt

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 8080

# Start HTTP server
CMD ["npm", "start"]
```

2. Build the Docker image:

```bash
docker build -t bpmn-lite-dsl .
```

3. Run the containerized application:

```bash
docker run -p 8080:8080 bpmn-lite-dsl
```

4. Access the application at http://localhost:8080

## Troubleshooting

### Build Issues

- **Missing Node.js dependencies**: Run `npm install` to install dependencies
- **Missing Python dependencies**: Run `pip install -r tools/requirements.txt`
- **Permission issues with Python script**: Ensure the script is executable (`chmod +x tools/ast_to_visio.py`)

### Python Issues

- **Python not found**: Ensure Python is in your PATH or specify the full path to the Python interpreter
- **Dependencies not found**: Install the required packages with `pip install pandas openpyxl numpy`
- **Version mismatch**: Ensure you're using Python 3.6+

### Visio Export Issues

- **Excel file generation fails**: Check Python installation and dependencies
- **Script execution error**: Verify that the Python script is accessible and has execute permissions
- **Import into Visio fails**: Ensure the Excel file format is compatible with your Visio version

## Custom Build Configurations

### Customizing the Build Script

The build process can be customized by modifying `build.js`. Common customizations include:

- Changing output directory
- Adding file minification
- Including additional resources
- Configuring environment-specific settings

### Environment-Specific Builds

For different environments, you can:

1. Create environment-specific configuration files (e.g., `.env.development`, `.env.production`)
2. Modify the build script to read the appropriate configuration based on NODE_ENV
3. Run the build with the specific environment:

```bash
NODE_ENV=production npm run build
```

## CI/CD Integration

The build process can be integrated into CI/CD pipelines:

### GitHub Actions Example

```yaml
name: Build and Deploy

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    
    - name: Setup Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        npm install
        pip install -r tools/requirements.txt
    
    - name: Build
      run: npm run build
    
    - name: Deploy
      # Add your deployment steps here
```

## Project Structure

Understanding the project structure helps with the build process:

```
bpl/
├── build.js           # Main build script
├── package.json       # Node.js dependencies and scripts
├── README.md          # Project documentation
├── src/
│   ├── index.html     # Main HTML file
│   └── gem.html       # Additional HTML file
├── tools/
│   ├── ast_to_visio.py       # Python script for Visio export
│   ├── requirements.txt      # Python dependencies
│   └── README.md             # Tool documentation
├── samples/
│   ├── order_process.bpl     # Example BPL file
│   ├── order_process-ast.json # Example AST
│   └── order_process.xlsx    # Example Visio export
└── dist/               # Build output directory
    ├── index.html      # Copied HTML
    ├── tools/          # Copied tools
    └── samples/        # Copied samples
```