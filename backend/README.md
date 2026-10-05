# Feedback Desk Backend & AI Analysis Engine

An intelligent backend system for the **Feedback Desk** platform, featuring a high-performance **Local AI Engine** that automatically classifies customer feedback into Categories, Sentiments, and Priority levels without relying on external paid APIs.

---

## 🚀 Key Features

*   **Zero-Shot AI Classification**: Uses `Xenova/nli-deberta-v3-xsmall` to understand text semantics.
*   **Multi-Dimensional Analysis**: Automatically assigns:
    *   **Category** (Bug, Feature, UI/UX, etc.)
    *   **Sentiment** (Positive, Negative, Neutral)
    *   **Priority** (High, Medium, Low)
*   **Privacy-First**: The AI model runs **locally** on your server. No customer data is sent to 3rd party clouds.
*   **Batch Processing**: Capable of processing 50+ feedback items in seconds.
*   **Excel Export**: Generates detailed XLSX reports of the analysis.
*   **Dockerized**: Fully containerized for easy deployment to Render, AWS, or DigitalOcean.

---

## 🛠️ Technology Stack

*   **Runtime:** Node.js (v18+)
*   **AI Framework:** [Transformers.js](https://huggingface.co/docs/transformers.js/index) (ONNX)
*   **AI Model**: `Xenova/mobilebert-uncased-mnli` (Optimized for low-memory environments like Render Free Tier)
*   **Database:** PostgreSQL
*   **API:** Express.js
*   **Container:** Docker

---

## ⚡ Quick Start

### 1. Prerequisites
*   Node.js v18 or higher.
*   Docker (optional, for containerization).

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone <repo-url>
cd feedback-desk-backend
npm install
```

### 3. Configuration
Create a `.env` file in the root directory:
```env
PORT=5000
DATABASE_URL=postgres://user:password@localhost:5432/feedback_desk
HF_TOKEN=your_huggingface_token_here  # Only required if using the API benchmark script
```

---

## 🧠 AI Classification Usage

The project includes specialized scripts for classifying feedback.

### A. Run Batch Classification (Production Script)
This runs the local AI model on your dataset (`input_data/feedback_data.json`) and exports the results.

```bash
node src/classify_feedback.js
```
*   **Input:** `input_data/feedback_data.json`
*   **Output:** `classified_feedback.xlsx`
*   **Performance:** ~10 seconds for 50 items.

### B. Run Benchmark (Local vs. API)
Comparing different models (BART vs. DeBERTa vs. API).

```bash
node src/index.js
```
*   **Output:** Console table overview & `feedback_analysis_results.xlsx`.

### C. Real-Time API (Single Input)
Classify text instantly via REST API.

**Endpoint:** `POST /api/classify`
**Body:**
```json
{
  "text": "The app crashes when I click upload.",
  "code": {Ask Developer for code},
  "labels": ["Bug", "Feature", "Inquiry"] // Optional custom categories
}
```
**Response:**
```json
{
  "category": {
    "label": "Bug",
    "score": 0.98,
    "confidence": "98.15%",
    "all_scores": { "Bug": 0.98, "Feature": 0.01, "Inquiry": 0.01 }
  },
  "sentiment": {
    "label": "Negative",
    "score": 0.99,
    "confidence": "99.02%",
    "all_scores": { "Negative": 0.99, "Neutral": 0.01, "Positive": 0.00 }
  },
  "priority": {
    "label": "High Priority",
    "score": 0.95,
    "confidence": "95.40%",
    "all_scores": { "High Priority": 0.95, "Medium Priority": 0.03, "Low Priority": 0.02 }
  }
}
```

---

## 🐳 Docker Deployment

### Run Application (Backend + AI)
Build and run the Node.js container. This image includes the AI model components.

```bash
# Build the image
docker build -t feedback-backend .

# Run the container locally
docker run -p 5000:5000 feedback-backend
```

### Run Database (Local Dev)
Start a PostgreSQL instance using Docker Compose:
```bash
docker-compose up -d
```

---

## 📚 Documentation

For a deep dive into how the AI model works, the logic behind the "Zero-Shot" classification, and detailed benchmarks, please refer to:

👉 **[SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md)**

### Code Structure
*   `server.js`: Main Express API entry point.
*   `src/classify_feedback.js`: **Production AI Script**. Clean logic using only the best model.
*   `src/index.js`: **Benchmark Script**. Contains logic for testing 6+ different models.
*   `input_data/feedback_data.json`: Test dataset of 50 feedback examples.