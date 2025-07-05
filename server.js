const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());

// Serve static files from the current directory
app.use(express.static(__dirname));

// Parse JSON request bodies
app.use(express.json());

// Create a directory for audio files if it doesn't exist
const audioDir = path.join(__dirname, 'audio');
if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir);
}

// Route to handle text-to-speech conversion
app.post('/api/speak', (req, res) => {
    const { text, lang = 'en' } = req.body;
    
    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }
    
    // Create a unique filename based on timestamp
    const timestamp = Date.now();
    const filename = `speech_${timestamp}.mp3`;
    const outputPath = path.join(audioDir, filename);
    
    // Command to run Python script with gTTS
    const command = `python3 -c "from gtts import gTTS; tts = gTTS('${text.replace(/'/g, "\'")}'.strip(), lang='${lang}'); tts.save(r'${outputPath.replace(/\\/g, '\\\\')}')"`;;
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ error: 'Failed to generate speech' });
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }
        
        // Return the URL to the generated audio file
        res.json({ audioUrl: `/audio/${filename}` });
    });
});

// Route to handle translation and text-to-speech
app.post('/api/translate-speak', (req, res) => {
    const { text, source_lang = 'auto', target_lang = 'en' } = req.body;
    
    console.log('=== TRANSLATION REQUEST RECEIVED ===');
    console.log('Request body:', req.body);
    console.log('Text:', text);
    console.log('Source language:', source_lang);
    console.log('Target language:', target_lang);
    
    if (!text) {
        console.error('Error: Text is required but not provided');
        return res.status(400).json({ error: 'Text is required' });
    }
    
    // Create a unique filename based on timestamp
    const timestamp = Date.now();
    const filename = `speech_${timestamp}.mp3`;
    const outputPath = path.join(audioDir, filename);
    
    // Create a temporary Python script file for translation
    const tempScriptPath = path.join(__dirname, `temp_translate_${timestamp}.py`);
    const pythonScript = `
import sys
import io
import codecs
from gtts import gTTS
from deep_translator import GoogleTranslator

# Set stdout to use UTF-8 encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

try:
    # Always use 'auto' or a specific language code for source_lang, never None
    src_lang = 'auto' if '${source_lang}' == 'auto' else '${source_lang}'
    target_lang = '${target_lang}'
    text_to_translate = """${text.replace(/"/g, '\"').replace(/\n/g, ' ')}"""  # Use triple quotes to handle special characters
    
    # Log the translation attempt for debugging
    print(f'Attempting translation from {src_lang} to {target_lang}', file=sys.stderr)
    
    # Special case for English target language
    if target_lang == 'en':
        # If source is auto, detect the language first
        if src_lang == 'auto':
            # Use GoogleTranslator to detect the language
            detector = GoogleTranslator(source='auto', target='en')
            detected_lang = detector.detect(text_to_translate)
            print(f'Detected language: {detected_lang}', file=sys.stderr)
            
            # If detected as English, skip translation
            if detected_lang == 'en':
                print(f'Source already in English, skipping translation', file=sys.stderr)
                translated_text = text_to_translate
            else:
                # Translate to English
                translator = GoogleTranslator(source=detected_lang, target='en')
                translated_text = translator.translate(text_to_translate)
        else:
            # If source is explicitly English, skip translation
            if src_lang == 'en':
                print(f'Source already in English, skipping translation', file=sys.stderr)
                translated_text = text_to_translate
            else:
                # Translate to English
                translator = GoogleTranslator(source=src_lang, target='en')
                translated_text = translator.translate(text_to_translate)
    else:
        # Normal translation for non-English target languages
        translator = GoogleTranslator(source=src_lang, target=target_lang)
        translated_text = translator.translate(text_to_translate)
    
    # Log successful translation
    print(f'Translation successful: {translated_text[:30]}...', file=sys.stderr)
    
    if not translated_text:
        print('ERROR: Translation failed - empty result', file=sys.stderr)
        sys.exit(1)
    
    # Generate speech from translated text
    tts = gTTS(translated_text, lang=target_lang)
    tts.save(r'${outputPath.replace(/\\/g, '\\\\')}')
    
    # Write translated text to stdout with UTF-8 encoding
    with io.open(sys.stdout.fileno(), 'w', encoding='utf-8') as f:
        f.write(translated_text)
except Exception as e:
    print(f'ERROR: {str(e)}', file=sys.stderr)
    sys.exit(1)
`;

    // Write the Python script to a file
    fs.writeFileSync(tempScriptPath, pythonScript);
    
    // Execute the Python script with UTF-8 encoding
    const command = `python3 "${tempScriptPath}"`;
    
    console.log('Executing translation script...');
    
    // Use execOptions to set encoding to UTF-8
    const execOptions = { encoding: 'utf8' };
    
    exec(command, execOptions, (error, stdout, stderr) => {
        // Clean up the temporary script file
        try {
            fs.unlinkSync(tempScriptPath);
        } catch (err) {
            console.error('Error deleting temporary script:', err);
        }
        
        if (error || (stderr && stderr.includes('ERROR:'))) {
            console.error(`Translation error: ${error ? error.message : stderr}`);
            return res.status(500).json({ 
                error: 'Failed to translate and generate speech', 
                details: stderr || error.message,
                errorType: 'translation_error'
            });
        }
        
        // Get the translated text from stdout
    const translatedText = stdout.trim();
    console.log('Translation successful, audio file created');
    console.log('Translated text:', translatedText);
    
    if (!translatedText) {
        console.error('Warning: No translated text received from Python script');
        return res.status(500).json({
            error: 'Failed to get translated text',
            details: 'No translated text was returned from the translation service',
            errorType: 'translation_error'
        });
    }
    
    // Check if audio file was created successfully
    if (!fs.existsSync(outputPath)) {
        console.error('Warning: Audio file was not created');
        return res.status(500).json({
            error: 'Failed to generate speech',
            details: 'The audio file could not be created',
            errorType: 'audio_generation_error'
        });
    }
        
        // Return the URL to the generated audio file and the translated text
        res.json({ 
            audioUrl: `/audio/${filename}`,
            translatedText: translatedText
        });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Access the chatbot at http://localhost:${PORT}/index.html`);
});
