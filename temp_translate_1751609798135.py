
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
    src_lang = 'auto' if 'auto' == 'auto' else 'auto'
    target_lang = 'bn'
    text_to_translate = """Translation failed. Please try again."""  # Use triple quotes to handle special characters
    
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
    tts.save(r'C:\\Users\\ASUS\\OneDrive\\Desktop\\Avtar2\\audio\\speech_1751609798135.mp3')
    
    # Write translated text to stdout with UTF-8 encoding
    with io.open(sys.stdout.fileno(), 'w', encoding='utf-8') as f:
        f.write(translated_text)
except Exception as e:
    print(f'ERROR: {str(e)}', file=sys.stderr)
    sys.exit(1)
