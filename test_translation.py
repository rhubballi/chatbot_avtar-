from deep_translator import GoogleTranslator

def test_translation():
    try:
        # Test with auto language detection
        translator = GoogleTranslator(source=None, target='hi')
        result = translator.translate('Hello, how are you?')
        print(f"Auto to Hindi: {result}")
        
        # Test with specific source language
        translator = GoogleTranslator(source='en', target='hi')
        result = translator.translate('Hello, how are you?')
        print(f"English to Hindi: {result}")
        
        # Test with another language
        translator = GoogleTranslator(source='en', target='fr')
        result = translator.translate('Hello, how are you?')
        print(f"English to French: {result}")
        
        print("All translations successful!")
        return True
    except Exception as e:
        print(f"Translation error: {str(e)}")
        return False

if __name__ == "__main__":
    test_translation()