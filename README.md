# AI Chatbot with Avatar

An interactive chatbot with a robot avatar that features text-to-speech and translation capabilities.

## Features

- Interactive robot avatar with animations
- Text-to-speech using Google TTS or browser's built-in speech synthesis
- Translation support for multiple languages
- Click on words to restart speech from that point
- Support for many languages including Indian languages

## Technologies Used

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js with Express
- Text-to-Speech: Google Text-to-Speech (gTTS)
- Translation: Google Translator API

## Prerequisites

- Node.js (v12 or higher)
- Python 3.6 or higher
- Required Python packages: gtts, googletrans

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/ai-chatbot-avatar.git
   cd ai-chatbot-avatar
   ```

2. Install Node.js dependencies:
   ```
   npm install
   ```

3. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

## Usage

1. Start the server:
   ```
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

3. Type a message in the input field and click "Send" to hear the robot speak.

## Configuration

- **Voice Type**: Choose between Google TTS (better quality) or Browser TTS
- **Translation**: Enable/disable translation feature
- **Target Language**: Select the language you want the text to be translated to

## Project Structure

- `index.html`: Main HTML file
- `styles.css`: CSS styling
- `script.js`: Frontend JavaScript
- `server.js`: Node.js backend server
- `robot-avatar.svg`: SVG file for the robot avatar
- `requirements.txt`: Python dependencies

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Text-to-Speech API
- Google Translator API