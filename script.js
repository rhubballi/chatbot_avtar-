document.addEventListener('DOMContentLoaded', function() {
    // API Configuration
    const SERVER_URL = 'http://localhost:3000';
    let useGTTS = true; // Set to true to use gTTS instead of browser TTS
    let useTranslation = false; // Set to false by default, toggle with translation button
    let selectedVoiceLanguage = 'en'; // Default voice language
    
    // DOM Elements
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-btn');
    const robot = document.getElementById('robot-container');
    const inputTextDisplay = document.getElementById('input-text-display');
    const translatedTextDisplay = document.getElementById('translated-text-display');
    const inputSection = document.querySelector('.text-section:first-child');
    const translatedSection = document.querySelector('.text-section:last-child');
    const robotSvg = document.getElementById('robot-svg');
    let mouthElement = null;
    let leftArmWave = null;
    let rightArmWave = null;
    let mouthAnim = null;
    let antennaAnim = null;
    let handMovementInterval = null;
    
    // Control elements
    const toggleTTSButton = document.getElementById('toggle-tts');
    const toggleBrowserTTSButton = document.getElementById('toggle-browser-tts');
    const toggleTranslationButton = document.getElementById('toggle-translation');
    const voiceSelect = document.getElementById('voice-select');
    
    // Speech synthesis setup
    const speechSynthesis = window.speechSynthesis;
    let voices = [];
    let currentUtterance = null;
    let wordElements = [];
    let translatedWordElements = []; // Track translated word elements
    let currentWordIndex = 0;
    
    // Initialize avatar SVG elements once loaded
    function initRobotSvg() {
        try {
            // Get the SVG document from the object tag
            const svgObject = document.getElementById('robot-svg');
            if (!svgObject) {
                console.error('Robot SVG object not found in the DOM');
                return;
            }
            
            console.log('Initializing robot SVG...');
            
            // Wait for the SVG to load
            svgObject.addEventListener('load', function() {
                // Access the SVG document
                const svgDoc = svgObject.contentDocument;
                if (!svgDoc) {
                    console.error('Could not access SVG document');
                    return;
                }
                
                console.log('SVG document loaded successfully');
                
                // Get animation elements from the SVG document
                mouthElement = svgDoc.getElementById('mouth');
                leftArmWave = svgDoc.getElementById('leftArmWave');
                rightArmWave = svgDoc.getElementById('rightArmWave');
                
                // Log what we found to debug
                console.log('SVG elements loaded:', {
                    mouthElement: mouthElement ? 'found' : 'not found',
                    leftArmWave: leftArmWave ? 'found' : 'not found',
                    rightArmWave: rightArmWave ? 'found' : 'not found'
                });
                
                // Get eye blink animations
                const eyeBlinkElements = svgDoc.querySelectorAll('.eye-blink');
                console.log('Eye blink elements found:', eyeBlinkElements.length);
                
                // Initialize all animations to not play automatically
                if (leftArmWave) leftArmWave.setAttribute('begin', 'indefinite');
                if (rightArmWave) rightArmWave.setAttribute('begin', 'indefinite');
                
                eyeBlinkElements.forEach(eye => {
                    if (eye.nodeName === 'animate') {
                        eye.setAttribute('begin', 'indefinite');
                    }
                });
                
                // Setup eye blinking
                setupEyeBlinking(eyeBlinkElements);
                
                // Start a test animation to verify everything works
                robot.classList.add('talking');
                startRobotAnimations();
                setTimeout(() => {
                    stopRobotAnimations();
                    robot.classList.remove('talking');
                }, 2000);
            });
            
            // Add error handling for SVG loading
            svgObject.addEventListener('error', function(e) {
                console.error('Error loading SVG:', e);
            });
        } catch (e) {
            console.error('Error accessing SVG elements:', e);
        }
    }
    
    // Function to set up automatic eye blinking
    function setupEyeBlinking(eyeBlinkElements) {
        if (!eyeBlinkElements || eyeBlinkElements.length === 0) return;
        
        // Start a timer for random eye blinking
        setInterval(() => {
            // Only blink if not currently speaking
            if (!robot.classList.contains('talking')) {
                // Trigger eye blink
                eyeBlinkElements.forEach(eye => {
                    if (eye.nodeName === 'animate') {
                        eye.setAttribute('begin', '0s');
                    }
                });
                
                // Reset after a short delay
                setTimeout(() => {
                    eyeBlinkElements.forEach(eye => {
                        if (eye.nodeName === 'animate') {
                            eye.setAttribute('begin', 'indefinite');
                        }
                    });
                }, 150);
            }
        }, 3000 + Math.random() * 2000); // Random blink interval between 3-5 seconds
    }
    
    // Initialize the robot SVG
    setTimeout(initRobotSvg, 500); // Give time for the SVG to load
    
    // Get available voices
    function loadVoices() {
        voices = speechSynthesis.getVoices();
    }
    
    // Load voices when they are available
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    loadVoices();
    
    // Function to display text as clickable words
    function displayText(text, isTranslated = false) {
        // Determine which display to use
        const displayElement = isTranslated ? translatedTextDisplay : inputTextDisplay;
        const sectionElement = isTranslated ? translatedSection : inputSection;
        
        // Clear previous text
        displayElement.innerHTML = '';
        
        // Add active class to the section for visual feedback
        sectionElement.classList.add('active-section');
        
        // If the text contains HTML (like info messages), just set it directly
        if (text.includes('<div class="info-message">') || text.includes('<div class="error-message">')) {
            displayElement.innerHTML = text;
            return [];
        }
        
        // Reset word elements if this is the input text
        if (!isTranslated) {
            wordElements = [];
        } else {
            translatedWordElements = [];
        }
        
        // Split text into words
        const words = text.split(/\s+/);
        const localWordElements = [];
        
        // Create a span for each word
        words.forEach((word, index) => {
            const wordSpan = document.createElement('span');
            wordSpan.textContent = word;
            wordSpan.className = 'word';
            wordSpan.dataset.index = index;
            wordSpan.dataset.word = word;
            
            // Add click event to each word
            wordSpan.addEventListener('click', function() {
                if (!isTranslated) {
                    speakFromWord(index);
                } else {
                    speakTranslatedFromWord(index);
                }
            });
            
            displayElement.appendChild(wordSpan);
            
            // Track word elements for both input and translated text
            if (!isTranslated) {
                wordElements.push(wordSpan);
            } else {
                translatedWordElements.push(wordSpan);
                localWordElements.push(wordSpan);
            }
            
            // Add a space after each word except the last one
            if (index < words.length - 1) {
                displayElement.appendChild(document.createTextNode(' '));
            }
        });
        
        return isTranslated ? localWordElements : words;
    }
    
    // Function to highlight the current word being spoken
    function highlightWord(index) {
        // Remove highlight from all words
        wordElements.forEach(wordSpan => {
            wordSpan.classList.remove('highlight');
        });
        
        // Add highlight to current word
        if (index >= 0 && index < wordElements.length) {
            wordElements[index].classList.add('highlight');
        }
    }
    
    // Function to speak from a specific word
function speakFromWord(startIndex) {
    // Stop any ongoing speech
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    
    // Get the text from the startIndex to the end
    const wordsToSpeak = wordElements.slice(startIndex).map(span => span.dataset.word).join(' ');
    
    // Start speaking from the selected word
    currentWordIndex = startIndex;
    speak(wordsToSpeak, startIndex);
}

// Function to speak from a specific word in the translated text
function speakTranslatedFromWord(startIndex) {
    // Stop any ongoing speech
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    
    // Get the text from the startIndex to the end
    const wordsToSpeak = translatedWordElements.slice(startIndex).map(span => span.dataset.word).join(' ');
    
    // Start speaking from the selected word
    currentWordIndex = startIndex;
    
    // Use the appropriate TTS method based on current settings
    if (useGTTS) {
        speakWithGTTS(wordsToSpeak, startIndex, true);
    } else {
        speakWithBrowserTTS(wordsToSpeak, startIndex, true);
    }
}
    
    // Function to speak text
function speak(text, startWordIndex = 0) {
    // Cancel any ongoing speech
    if (currentUtterance) {
        speechSynthesis.cancel();
    }
    
    // If no text is provided, return
    if (!text) {
        console.warn('No text provided to speak function');
        return;
    }
    
    console.log('Speaking text:', text);
    
    // Display the text if it's a new text (not continuing from a word)
    if (startWordIndex === 0) {
        // Clear both displays if not using translation
        if (!useTranslation) {
            // Reset sections first
            resetSections();
            // Display the text in the input section
            displayText(text);
        }
        // If using translation, the displays will be handled by speakWithGTTSTranslation
    }
    
    // Make sure robot is in talking state and animations are running
    if (!robot.classList.contains('talking')) {
        console.log('Starting robot animations for speech');
        robot.classList.add('talking');
        startRobotAnimations();
        
        // Ensure hand movements are started
        if (!handMovementInterval) {
            console.log('Explicitly starting hand movements for speech');
            startContinuousHandMovement();
        }
    }
    
    highlightWord(startWordIndex);
    
    // Set starting word index
    currentWordIndex = startWordIndex;
    
    if (useGTTS) {
        // Use our gTTS backend service
        console.log('Using gTTS for speech');
        if (useTranslation) {
            // Always use translation for input to selected language
            console.log('Using translation with target language:', selectedVoiceLanguage);
            // Don't display text here as it will be displayed by speakWithGTTSTranslation
            speakWithGTTSTranslation(text, startWordIndex);
            return;
        }
        speakWithGTTS(text, startWordIndex);
    } else {
        speakWithBrowserTTS(text, startWordIndex);
    }
}
    
    // Set up control buttons event listeners
    toggleTTSButton.addEventListener('click', function() {
        useGTTS = true;
        toggleTTSButton.classList.add('active');
        toggleBrowserTTSButton.classList.remove('active');
        
        // Reset sections first
        resetSections();
        
        // Show a message about the TTS change
        inputTextDisplay.innerHTML = `<div class="info-message">Using Google Text-to-Speech for better quality</div>`;
        inputSection.classList.add('active-section');
        
        setTimeout(() => {
            resetSections();
        }, 2000);
    });
    
    toggleBrowserTTSButton.addEventListener('click', function() {
        useGTTS = false;
        toggleBrowserTTSButton.classList.add('active');
        toggleTTSButton.classList.remove('active');
        
        // Reset sections first
        resetSections();
        
        // Show a message about the TTS change
        inputTextDisplay.innerHTML = `<div class="info-message">Using Browser's built-in Text-to-Speech</div>`;
        inputSection.classList.add('active-section');
        
        setTimeout(() => {
            resetSections();
        }, 2000);
    });
    
    // Translation toggle button
    toggleTranslationButton.addEventListener('click', function() {
        useTranslation = !useTranslation;
        
        // Reset sections first
        resetSections();
        
        if (useTranslation) {
            toggleTranslationButton.textContent = 'Translation Enabled';
            toggleTranslationButton.classList.add('active');
            // Show a message about the translation feature
            const selectedLanguageName = voiceSelect.options[voiceSelect.selectedIndex].text;
            const translationMsg = `English input will be translated to ${selectedLanguageName} and spoken in that language`;
            inputTextDisplay.innerHTML = `<div class="info-message">${translationMsg}</div>`;
            inputSection.classList.add('active-section');
            setTimeout(() => {
                resetSections();
            }, 3000);
        } else {
            toggleTranslationButton.textContent = 'Enable Translation';
            toggleTranslationButton.classList.remove('active');
            inputTextDisplay.innerHTML = `<div class="info-message">Translation disabled. Text will be spoken in original language.</div>`;
            inputSection.classList.add('active-section');
            setTimeout(() => {
                resetSections();
            }, 2000);
        }
    });
    
    // Voice selection
    voiceSelect.addEventListener('change', function() {
        selectedVoiceLanguage = voiceSelect.value;
        
        // If translation is enabled, show a message about the new target language
        if (useTranslation) {
            // Reset sections first
            resetSections();
            
            const selectedLanguageName = voiceSelect.options[voiceSelect.selectedIndex].text;
            const translationMsg = `Target language changed to ${selectedLanguageName}`;
            inputTextDisplay.innerHTML = `<div class="info-message">${translationMsg}</div>`;
            inputSection.classList.add('active-section');
            
            setTimeout(() => {
                resetSections();
            }, 2000);
        }
    });
    
    // Function to detect language of text
    function detectLanguage(text) {
        // Simple language detection based on character sets
        // Hindi characters range: \u0900-\u097F
        const hindiPattern = /[\u0900-\u097F]/;
        // Chinese characters
        const chinesePattern = /[\u4E00-\u9FFF]/;
        // Japanese characters (Hiragana, Katakana, Kanji)
        const japanesePattern = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]/;
        // Spanish/French/German common accented characters
        const europeanPattern = /[áéíóúüñçàèìòùâêîôûäëïöü]/i;
        
        if (hindiPattern.test(text)) return 'hi';
        if (chinesePattern.test(text)) return 'zh-CN';
        if (japanesePattern.test(text)) return 'ja';
        if (europeanPattern.test(text)) {
            // Further differentiate European languages if needed
            // This is a simplified approach
            if (text.includes('ñ')) return 'es'; // Spanish
            if (text.includes('ç')) return 'fr'; // French
            if (text.includes('ä') || text.includes('ö') || text.includes('ü')) return 'de'; // German
            return 'es'; // Default to Spanish for other European accents
        }
        
        return 'en'; // Default to English
    }
    
    // Function to speak using browser's built-in speech synthesis
function speakWithBrowserTTS(text, startWordIndex, isTranslated = false) {
    // Create a new utterance
    currentUtterance = new SpeechSynthesisUtterance(text);
    
    // Detect language of the text
    const detectedLang = detectLanguage(text);
    currentUtterance.lang = detectedLang;
    console.log('Detected language:', detectedLang);
    
    // Set voice based on detected language
    if (voices.length > 0) {
        // Filter voices by detected language
        const langVoices = voices.filter(voice => voice.lang.includes(detectedLang.split('-')[0]));
        
        // Try to find a female voice in the detected language
        const femaleVoices = langVoices.filter(voice => 
            voice.name.includes('Female') || voice.name.includes('female') || 
            voice.name.includes('woman') || voice.name.includes('Woman') || 
            voice.name.includes('girl') || voice.name.includes('Girl'));
        
        if (femaleVoices.length > 0) {
            currentUtterance.voice = femaleVoices[0];
            console.log('Using female voice for', detectedLang + ':', femaleVoices[0].name);
        } else if (langVoices.length > 0) {
            // Fallback to any voice in the detected language
            currentUtterance.voice = langVoices[0];
            currentUtterance.pitch = 1.2; // Slightly higher pitch for feminine sound
            console.log('Using voice for', detectedLang + ':', langVoices[0].name);
        } else {
            // If no voice found for the detected language, try to find any female voice
            const anyFemaleVoices = voices.filter(voice => 
                voice.name.includes('Female') || voice.name.includes('female') || 
                voice.name.includes('woman') || voice.name.includes('Woman') || 
                voice.name.includes('girl') || voice.name.includes('Girl'));
            
            if (anyFemaleVoices.length > 0) {
                currentUtterance.voice = anyFemaleVoices[0];
                console.log('No voice found for', detectedLang + ', using female voice:', anyFemaleVoices[0].name);
            }
        }
    }
    
    // Set speech properties for a more feminine voice
    currentUtterance.rate = 1; // Normal speed
    currentUtterance.pitch = 1.2; // Slightly higher pitch for feminine voice
    currentUtterance.volume = 1; // Full volume
    
    // Set up word highlighting based on estimated timing
    const estimatedDuration = text.length * 50; // Rough estimate: 50ms per character
    setupWordHighlighting(text, estimatedDuration / 1000, startWordIndex, isTranslated);
    
    // Add event for mouth movement during speech
    currentUtterance.onboundary = function(event) {
        // Trigger mouth movement on word boundaries
        if (event.name === 'word') {
            addMumbleEffect(300);
        }
    };
    
    // Handle end of speech
    currentUtterance.onend = function() {
        // Remove animation class
        robot.classList.remove('talking');
        
        // Remove highlight from all words
        wordElements.forEach(word => word.classList.remove('highlight'));
        
        // Stop robot animations
        stopRobotAnimations();
        
        currentUtterance = null;
    };
    
    // Start speaking
    speechSynthesis.speak(currentUtterance);
    }
    
    // Function to set up word highlighting during speech
function setupWordHighlighting(text, duration, startWordIndex, isTranslated = false) {
    const words = text.split(/\s+/);
    const wordCount = words.length;
    
    // Determine which word elements to use
    const elementsToHighlight = isTranslated ? translatedWordElements : wordElements;
    
    // Ensure duration is at least 1 second to prevent division by zero or negative values
    const effectiveDuration = Math.max(1, duration);
    const intervalTime = (effectiveDuration * 1000) / wordCount; // Convert duration to milliseconds
    
    console.log(`Setting up word highlighting: ${wordCount} words, ${effectiveDuration}s duration, ${intervalTime}ms per word, isTranslated: ${isTranslated}`);
    
    let currentWord = startWordIndex;
    const wordInterval = setInterval(() => {
        // Remove highlight from all words in both sections
        wordElements.forEach(word => word.classList.remove('highlight'));
        translatedWordElements.forEach(word => word.classList.remove('highlight'));
        
        // Add highlight to current word
        if (currentWord < elementsToHighlight.length) {
            elementsToHighlight[currentWord].classList.add('highlight');
            console.log(`Highlighting word: ${elementsToHighlight[currentWord].dataset.word} (${currentWord+1}/${elementsToHighlight.length})`);
            
            // Add random expressions based on words
            if (elementsToHighlight[currentWord]) {
                const currentWordText = elementsToHighlight[currentWord].dataset.word.toLowerCase();
                addRandomExpressionForWord(currentWordText);
                
                // Add mouth movement for each word
                addMumbleEffect(300);
                
                // Add hand gestures based on words
                addHandGesture(currentWordText);
            }
            
            currentWord++;
        } else {
            clearInterval(wordInterval);
            console.log('Word highlighting complete');
        }
    }, intervalTime);
    
    // Clear interval when speech ends
    setTimeout(() => {
        clearInterval(wordInterval);
        wordElements.forEach(word => word.classList.remove('highlight'));
        translatedWordElements.forEach(word => word.classList.remove('highlight'));
        console.log('Speech ended, clearing word highlighting');
    }, effectiveDuration * 1000);
}
    
    // Function to speak using gTTS API
    function speakWithGTTS(text, startWordIndex, isTranslated = false) {
        // Use selected voice language if available, otherwise detect language
        const language = selectedVoiceLanguage || detectLanguage(text);
        const url = `${SERVER_URL}/api/speak`;
        
        console.log('Requesting speech from gTTS API...');
        
        // Only reset sections and display text if not speaking from a translated word
        if (!isTranslated) {
            // Reset sections first
            resetSections();
            
            // Display the text in the input section
            displayText(text);
            // Input section is already marked as active by displayText function
        }
        
        // Prepare the request body
        const requestBody = {
            text: text,
            lang: language
        };
        
        // Make the API request
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Create an audio element and play the speech
            const audioUrl = data.audioUrl;
            const audio = new Audio(audioUrl);
            
            console.log('Speech audio received:', audioUrl);
            
            // Set up event listeners for the audio
            audio.onplay = () => {
                console.log('gTTS audio started playing');
                // Ensure robot animations are running when audio starts
                if (!robot.classList.contains('talking')) {
                    robot.classList.add('talking');
                    startRobotAnimations();
                    console.log('Started robot animations on audio play');
                }
            };
            
            audio.onended = () => {
                console.log('gTTS audio finished playing');
                stopRobotAnimations();
                robot.classList.remove('talking');
            };
            
            audio.onerror = (error) => {
                console.error('Error playing gTTS audio:', error);
                stopRobotAnimations();
                robot.classList.remove('talking');
                // Fallback to browser TTS if audio playback fails
                speakWithBrowserTTS(text, startWordIndex);
            };
            
            // Play the audio
            audio.play().catch(e => {
                console.error('Error playing audio:', e);
                // Fallback to browser TTS if audio playback fails
                speakWithBrowserTTS(text, startWordIndex);
            });
            
            // Set up word highlighting based on audio duration
            audio.addEventListener('loadedmetadata', function() {
                console.log('Audio duration:', audio.duration);
                setupWordHighlighting(text, audio.duration || 5, startWordIndex, isTranslated);
            });
        })
        .catch(error => {
            console.error('Error with gTTS API:', error);
            // Fallback to browser TTS if gTTS fails
            speakWithBrowserTTS(text, startWordIndex);
        });
    }
    
    // Function to translate and speak using gTTS API
    function speakWithGTTSTranslation(text, startWordIndex) {
        // For English input, always use the selected language as the target
        const sourceLanguage = 'auto'; // Use auto-detection for input language
        let targetLanguage = selectedVoiceLanguage || 'en'; // Use selected voice as target language
        
        // If target language is also English, choose Hindi as default alternative
        if (targetLanguage === 'en') {
            targetLanguage = 'hi'; // Default to Hindi if no other language is selected
        }
        
        console.log(`Translating from ${sourceLanguage} to ${targetLanguage}`);
        
        const url = `${SERVER_URL}/api/translate-speak`;
        
        // Prepare the request body
        const requestBody = {
            text: text,
            source_lang: sourceLanguage,
            target_lang: targetLanguage
        };
        
        // Display original text in input section
        displayText(text, false);
        
        // Show loading message in translated section
        translatedTextDisplay.innerHTML = `<div class="info-message">Translating to ${getLanguageName(targetLanguage)}...</div>`;
        translatedSection.classList.add('active-section');
        
        // Make the API request
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // We already displayed the original text earlier, so we don't need to do it again
            // Just update the translated text section
            displayText(data.translatedText, true);
            
            // Add active class to both sections to show they're in use
            inputSection.classList.add('active-section');
            translatedSection.classList.add('active-section');
            
            // Create an audio element and play the speech
            const audioUrl = data.audioUrl;
            const audio = new Audio(audioUrl);
            
            // Set up event listeners for the audio
            audio.onplay = () => {
                console.log('Translated audio started playing');
                // Start robot animations if not already started
                if (!robot.classList.contains('talking')) {
                    robot.classList.add('talking');
                    startRobotAnimations();
                }
            };
            
            audio.onended = () => {
                console.log('Translated audio finished playing');
                stopRobotAnimations();
                robot.classList.remove('talking');
            };
            
            audio.onerror = (error) => {
                console.error('Error playing translated audio:', error);
                stopRobotAnimations();
                robot.classList.remove('talking');
                
                // Reset sections first
                resetSections();
                
                // Show error message
                inputTextDisplay.innerHTML = `<div class="error-message">Error playing audio. Please try again.</div>`;
                inputSection.classList.add('active-section');
                
                // Fallback to regular gTTS if audio playback fails
                setTimeout(() => {
                    speakWithGTTS(text, startWordIndex);
                }, 2000);
            };
            
            // Play the audio
            audio.play().catch(e => {
                console.error('Error playing translated audio:', e);
                
                // Reset sections first
                resetSections();
                
                // Show error message
                inputTextDisplay.innerHTML = `<div class="error-message">Error playing audio. Please try again.</div>`;
                inputSection.classList.add('active-section');
                
                // Fallback to regular gTTS if audio playback fails
                setTimeout(() => {
                    speakWithGTTS(text, startWordIndex);
                }, 2000);
            });
            
            // Set up word highlighting based on estimated timing
            setupWordHighlighting(data.translatedText, audio.duration || 5, 0, true);
        })
        .catch(error => {
            console.error('Error with translation API:', error);
            
            // Extract detailed error message if available
            let errorMessage = 'Translation failed. Please try again.';
            
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                if (errorData.details) {
                    // Log detailed error for debugging
                    console.error('Detailed error:', errorData.details);
                    
                    // Check for specific error types
                    if (errorData.details.includes('httpcore._exceptions.ConnectTimeout') ||
                        errorData.details.includes('handshake operation timed out')) {
                        errorMessage = 'Translation service timed out. Please try again later.';
                    } else if (errorData.details.includes('NoneType')) {
                        errorMessage = 'Translation service returned an invalid response. Please try again.';
                    } else if (errorData.details.includes('AttributeError')) {
                        errorMessage = 'Translation service is currently unavailable. Please try again later.';
                    } else if (errorData.details.includes('Invalid source or target language')) {
                        errorMessage = 'Invalid language selection. Please choose a different language.';
                    }
                }
            }
            
            // Reset sections first
            resetSections();
            
            // Show error message
            inputTextDisplay.innerHTML = `<div class="error-message">${errorMessage}</div>`;
            inputSection.classList.add('active-section');
            
            // Fallback to regular gTTS if translation fails
            setTimeout(() => {
                console.log('Falling back to regular gTTS without translation');
                speakWithGTTS(text, startWordIndex);
            }, 2000);
        });
    }
    
    // Helper function to get language name from code
    function getLanguageName(langCode) {
        const languageMap = {
            // Common Languages
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'ja': 'Japanese',
            'ko': 'Korean',
            'zh-CN': 'Chinese',
            'pt': 'Portuguese',
            'ru': 'Russian',
            
            // Indian Languages
            'hi': 'Hindi',
            'bn': 'Bengali',
            'te': 'Telugu',
            'mr': 'Marathi',
            'ta': 'Tamil',
            'gu': 'Gujarati',
            'kn': 'Kannada',
            'ml': 'Malayalam',
            'pa': 'Punjabi',
            'or': 'Odia',
            'as': 'Assamese',
            'ur': 'Urdu',
            'sa': 'Sanskrit',
            'bho': 'Bhojpuri',
            'mai': 'Maithili',
            'doi': 'Dogri',
            'kok': 'Konkani',
            'mni': 'Meiteilon',
            'lus': 'Mizo',
            'awa': 'Awadhi',
            'brx': 'Bodo',
            'kha': 'Khasi',
            'trp': 'Kokborok',
            'mwr': 'Marwadi',
            'sat': 'Santali',
            'tcy': 'Tulu'
        };
        return languageMap[langCode] || langCode;
    }
    
    // Function to add expressions based on specific words
    function addRandomExpressionForWord(currentWord) {
        if (!robotSvg || !robotSvg.contentDocument || !currentWord) return;
        
        try {
            // Check for emotion words and add expressions
            if (['happy', 'glad', 'joy', 'smile', 'love', 'like'].some(word => currentWord.includes(word))) {
                // Happy expression - bigger smile
                if (mouthElement) {
                    mouthElement.setAttribute('d', 'M135,145 Q150,165 165,145');
                    setTimeout(() => {
                        if (mouthElement) mouthElement.setAttribute('d', 'M135,145 Q150,155 165,145');
                    }, 1000);
                }
            } else if (['sad', 'sorry', 'unhappy', 'bad', 'upset'].some(word => currentWord.includes(word))) {
                // Sad expression - downturned mouth
                if (mouthElement) {
                    mouthElement.setAttribute('d', 'M135,155 Q150,140 165,155');
                    setTimeout(() => {
                        if (mouthElement) mouthElement.setAttribute('d', 'M135,145 Q150,155 165,145');
                    }, 1000);
                }
            } else if (['wow', 'amazing', 'awesome', 'great', 'surprise'].some(word => currentWord.includes(word))) {
                // Surprised expression
                if (mouthElement) {
                    mouthElement.setAttribute('d', 'M135,145 Q150,170 165,145');
                    mouthElement.setAttribute('stroke-width', '3');
                    setTimeout(() => {
                        if (mouthElement) {
                            mouthElement.setAttribute('d', 'M135,145 Q150,155 165,145');
                            mouthElement.setAttribute('stroke-width', '2');
                        }
                    }, 1000);
                }
            }
        } catch (e) {
            console.error('Error adding expression:', e);
        }
    }
    
    // Function to handle user input
    function resetSections() {
        // Remove active class from both sections
        inputSection.classList.remove('active-section');
        translatedSection.classList.remove('active-section');
        
        // Clear both display sections
        inputTextDisplay.innerHTML = '';
        translatedTextDisplay.innerHTML = '';
    }
    
    function handleUserInput() {
        const text = userInput.value.trim();
        if (text) {
            // Reset sections before processing new input
            resetSections();
            
            speak(text);
            userInput.value = ''; // Clear input after sending
        }
    }
    
    // Handle send button click
    sendButton.addEventListener('click', handleUserInput);
    
    // Handle Enter key press
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent default to avoid new line
            sendButton.click(); // Trigger send button click
        }
    });
    
    // Function to start avatar animations
function startRobotAnimations() {
    if (!robotSvg || !robotSvg.contentDocument) return;
    
    try {
        const svgDoc = robotSvg.contentDocument;
        
        // Get the mouth element from the SVG document
        const mouthElement = svgDoc.getElementById('mouth');
        
        // Start mouth animation - set to neutral position first
        if (mouthElement) {
            mouthElement.setAttribute('d', 'M135,145 Q150,155 165,145');
            mouthElement.setAttribute('stroke', '#0080FF');
            mouthElement.setAttribute('stroke-width', '2.5');
            
            // Start mouth mumbling animation
            startMouthMumbling();
            console.log('Starting mouth mumbling animation');
        } else {
            console.error('Mouth element not found in SVG');
        }
        
        // Ensure hand movement is started immediately
        if (!handMovementInterval) {
            startContinuousHandMovement();
            console.log('Starting hand movement from animations function');
        }
            
            // Start eye blink animation with improved effect
            const eyeBlinkElements = svgDoc.querySelectorAll('.eye-blink');
            eyeBlinkElements.forEach(eye => {
                if (eye.nodeName === 'animate') {
                    eye.setAttribute('begin', '0s');
                }
            });
            
            // Add a subtle glow to the eyes
            const leftEyeGlow = svgDoc.querySelector('#left-eye circle:first-child');
            const rightEyeGlow = svgDoc.querySelector('#right-eye circle:first-child');
            
            if (leftEyeGlow && rightEyeGlow) {
                // Pulse the eye glow
                let glowIntensity = 0;
                const glowInterval = setInterval(() => {
                    if (!leftEyeGlow || !rightEyeGlow || !document.body.contains(svgDoc)) {
                        clearInterval(glowInterval);
                        return;
                    }
                    
                    // Create a subtle pulsing effect
                    glowIntensity = (glowIntensity + 1) % 20;
                    const opacity = 0.8 + (glowIntensity / 100);
                    
                    leftEyeGlow.setAttribute('opacity', opacity.toString());
                    rightEyeGlow.setAttribute('opacity', opacity.toString());
                }, 100);
                
                // Store the interval ID
                robotSvg.dataset.glowInterval = glowInterval;
            }
            
            // Start continuous hand movement animation
            startContinuousHandMovement();
            
            // Add subtle continuous body movement
            const bodyElement = svgDoc.getElementById('avatar-body');
            if (bodyElement) {
                // Add a subtle breathing effect
                let breatheIn = true;
                const breatheInterval = setInterval(() => {
                    if (!bodyElement || !document.body.contains(svgDoc)) {
                        clearInterval(breatheInterval);
                        return;
                    }
                    
                    const scaleValue = breatheIn ? 1.01 : 1;
                    bodyElement.setAttribute('transform', `scale(${scaleValue})`);
                    breatheIn = !breatheIn;
                }, 2000); // Slow breathing
                
                // Store the interval ID to clear it later
                bodyElement.dataset.breatheInterval = breatheInterval;
            }
            
            // Add a subtle antenna pulse effect
            const antennaLights = svgDoc.querySelectorAll('circle[cx="135"][cy="30"], circle[cx="165"][cy="30"]');
            if (antennaLights.length > 0) {
                let pulseUp = true;
                const antennaInterval = setInterval(() => {
                    if (!antennaLights || !document.body.contains(svgDoc)) {
                        clearInterval(antennaInterval);
                        return;
                    }
                    
                    // Pulse the antenna lights
                    antennaLights.forEach(light => {
                        if (pulseUp) {
                            light.setAttribute('fill', '#7FB3D5');
                            light.setAttribute('r', '5');
                        } else {
                            light.setAttribute('fill', '#5DADE2');
                            light.setAttribute('r', '4');
                        }
                    });
                    pulseUp = !pulseUp;
                }, 1500);
                
                // Store the interval ID
                robotSvg.dataset.antennaInterval = antennaInterval;
            }
        } catch (e) {
            console.error('Error starting animations:', e);
        }
    }
    
    // Function to start continuous hand movement
function startContinuousHandMovement() {
    if (!robotSvg || !robotSvg.contentDocument) {
        console.error('Robot SVG not available for hand movement');
        return;
    }
    
    const svgDoc = robotSvg.contentDocument;
    const leftArmWave = svgDoc.getElementById('leftArmWave');
    const rightArmWave = svgDoc.getElementById('rightArmWave');
    
    if (!leftArmWave || !rightArmWave) {
        console.error('Arm wave elements not found in SVG');
        return;
    }
    
    console.log('Starting continuous hand movement');
    
    // Clear any existing interval
    if (handMovementInterval) {
        clearInterval(handMovementInterval);
    }
    
    // Set up alternating arm movements with more frequent both arms
    let useLeftArm = true;
    let bothArmsCounter = 0;
    
    // Check if robot is talking initially
    const initialTalking = robot.classList.contains('talking');
    const initialInterval = initialTalking ? 700 : 1000;
    
    handMovementInterval = setInterval(() => {
        if (!robotSvg || !document.body.contains(robotSvg)) {
            // If robot SVG is not available, stop the movements
            if (handMovementInterval) {
                clearInterval(handMovementInterval);
                handMovementInterval = null;
                console.log('Stopping continuous hand movement - SVG not available');
                return;
            }
        }
        
        bothArmsCounter++;
        
        // Check if robot is talking - if not, use slower movements
        const isTalking = robot.classList.contains('talking');
        const movementDuration = isTalking ? 500 : 800; // Faster when talking
        
        // Every 2nd movement when talking (3rd when not), move both arms for emphasis
        const emphasisThreshold = isTalking ? 2 : 3;
        
        if (bothArmsCounter >= emphasisThreshold) {
            leftArmWave.setAttribute('begin', '0s');
            rightArmWave.setAttribute('begin', '0s');
            
            setTimeout(() => {
                if (leftArmWave) leftArmWave.setAttribute('begin', 'indefinite');
                if (rightArmWave) rightArmWave.setAttribute('begin', 'indefinite');
            }, movementDuration);
            
            bothArmsCounter = 0;
        } else {
            // Otherwise alternate arms
            if (useLeftArm) {
                leftArmWave.setAttribute('begin', '0s');
                setTimeout(() => {
                    if (leftArmWave) leftArmWave.setAttribute('begin', 'indefinite');
                }, movementDuration);
            } else {
                rightArmWave.setAttribute('begin', '0s');
                setTimeout(() => {
                    if (rightArmWave) rightArmWave.setAttribute('begin', 'indefinite');
                }, movementDuration);
            }
            useLeftArm = !useLeftArm;
        }
    }, initialInterval); // Use the initial interval value
    }
    
    // Function to stop avatar animations
    function stopRobotAnimations() {
        if (!robotSvg || !robotSvg.contentDocument) return;
        
        try {
            const svgDoc = robotSvg.contentDocument;
            const mouthElement = svgDoc.getElementById('mouth');
            
            // Reset mouth to neutral position
            if (mouthElement) {
                mouthElement.setAttribute('d', 'M135,145 Q150,155 165,145');
                mouthElement.setAttribute('stroke-dasharray', '');
                mouthElement.setAttribute('stroke', '#333333');
                mouthElement.setAttribute('stroke-width', '2');
            }
            
            // Stop eye blink animation
            const eyeBlinkElements = document.querySelectorAll('.eye-blink');
            eyeBlinkElements.forEach(eye => {
                if (eye.nodeName === 'animate') {
                    eye.setAttribute('begin', 'indefinite');
                }
            });
            
            // Reset eye glow
            const leftEyeGlow = document.querySelector('#left-eye ellipse:first-child');
            const rightEyeGlow = document.querySelector('#right-eye ellipse:first-child');
            
            if (leftEyeGlow && rightEyeGlow) {
                leftEyeGlow.setAttribute('opacity', '1');
                rightEyeGlow.setAttribute('opacity', '1');
            }
            
            // Clear eye glow interval
            if (robotSvg.dataset.glowInterval) {
                clearInterval(parseInt(robotSvg.dataset.glowInterval));
                delete robotSvg.dataset.glowInterval;
            }
            
            // Stop arm animations
            if (leftArmWave) {
                leftArmWave.setAttribute('begin', 'indefinite');
            }
            
            if (rightArmWave) {
                rightArmWave.setAttribute('begin', 'indefinite');
            }
            
            // Stop continuous hand movement
            if (handMovementInterval) {
                clearInterval(handMovementInterval);
                handMovementInterval = null;
            }
            
            // Stop the breathing effect
            const bodyElement = document.getElementById('avatar-body');
            if (bodyElement && bodyElement.dataset.breatheInterval) {
                clearInterval(parseInt(bodyElement.dataset.breatheInterval));
                bodyElement.setAttribute('transform', 'scale(1)');
                delete bodyElement.dataset.breatheInterval;
            }
            
            // Stop antenna pulse effect
            if (robotSvg.dataset.antennaInterval) {
                clearInterval(parseInt(robotSvg.dataset.antennaInterval));
                
                // Reset antenna light
                const antennaLight = document.querySelector('circle[cx="120"][cy="60"]');
                if (antennaLight) {
                    antennaLight.setAttribute('fill', '#5DADE2');
                    antennaLight.setAttribute('r', '4');
                }
                
                delete robotSvg.dataset.antennaInterval;
            }
        } catch (e) {
            console.error('Error stopping animations:', e);
        }
    }
    
    // Function to add random expressions during speech
function addRandomExpression() {
    if (!robotSvg || !robotSvg.contentDocument) {
        console.error('Robot SVG not available for expressions');
        return;
    }
    
    try {
        // Get the current word being spoken
        const currentWord = wordElements[currentWordIndex]?.dataset.word.toLowerCase();
        
        if (!currentWord) {
            console.warn('No current word available for expression');
            return;
        }
        
        console.log('Adding expression for word:', currentWord);
        
        // Call the word-specific expression function
        addRandomExpressionForWord(currentWord);
        
        // Add mumbling mouth movements for all words
        addMumbleEffect();
        
        // Add hand gestures based on words
        addHandGesture(currentWord);
        
        // Add subtle eye animations
        animateEyes(currentWord);
    } catch (e) {
        console.error('Error adding expression:', e);
    }
}
    
    // Function to animate eyes based on words
    function animateEyes(currentWord) {
        if (!robotSvg || !robotSvg.contentDocument) return;
        
        const svgDoc = robotSvg.contentDocument;
        const leftEye = svgDoc.querySelector('#left-eye circle:first-child');
        const rightEye = svgDoc.querySelector('#right-eye circle:first-child');
        
        if (!leftEye || !rightEye) return;
        
        // Words that might trigger wider eyes
        const surpriseWords = ['wow', 'amazing', 'awesome', 'great', 'surprise', 'shocked', 'incredible'];
        
        // Words that might trigger narrower eyes
        const suspiciousWords = ['suspicious', 'doubt', 'not sure', 'maybe', 'perhaps', 'thinking'];
        
        if (surpriseWords.some(word => currentWord.includes(word))) {
            // Make eyes wider
            leftEye.setAttribute('ry', '10');
            rightEye.setAttribute('ry', '10');
            
            // Reset after a short delay
            setTimeout(() => {
                if (leftEye && rightEye) {
                    leftEye.setAttribute('ry', '8');
                    rightEye.setAttribute('ry', '8');
                }
            }, 1000);
        } else if (suspiciousWords.some(word => currentWord.includes(word))) {
            // Make eyes narrower
            leftEye.setAttribute('ry', '5');
            rightEye.setAttribute('ry', '5');
            
            // Reset after a short delay
            setTimeout(() => {
                if (leftEye && rightEye) {
                    leftEye.setAttribute('ry', '8');
                    rightEye.setAttribute('ry', '8');
                }
            }, 1000);
        }
    }
    
    // Function to create mumbling effect with mouth movements
function addMumbleEffect(duration = 300) {
    if (!robotSvg || !robotSvg.contentDocument) return;
    
    const svgDoc = robotSvg.contentDocument;
    const mouthElement = svgDoc.getElementById('mouth');
    if (!mouthElement) return;
    
    // Create a sequence of mouth movements to simulate digital robot speech
    const mouthSequence = [
        'M135,145 Q150,150 165,145', // slight movement
        'M135,145 Q150,160 165,145', // open a bit more
        'M135,145 Q150,155 165,145', // back to neutral
        'M135,145 Q150,158 165,145', // open again
        'M135,145 Q150,152 165,145'  // slight movement
    ];
    
    // Add a digital effect to the mouth
    mouthElement.setAttribute('stroke', '#0080FF');
    mouthElement.setAttribute('stroke-width', '2.5');
    
    // Apply the sequence with timing
    let sequenceIndex = 0;
    const mumbleInterval = setInterval(() => {
        if (!mouthElement || !document.body.contains(robotSvg)) {
            clearInterval(mumbleInterval);
            return;
        }
        
        // Digital effect - occasionally show a straight line for a more robotic feel
        if (Math.random() < 0.2) {
            mouthElement.setAttribute('d', 'M135,150 L165,150');
            mouthElement.setAttribute('stroke-dasharray', '2,1.5');
        } else {
            mouthElement.setAttribute('d', mouthSequence[sequenceIndex]);
            mouthElement.setAttribute('stroke-dasharray', '');
        }
        
        sequenceIndex = (sequenceIndex + 1) % mouthSequence.length;
    }, duration / 10); // Fast enough to look like digital speech
    
    // Clear the interval after a short time
    setTimeout(() => {
        clearInterval(mumbleInterval);
        if (mouthElement) {
            mouthElement.setAttribute('d', 'M135,145 Q150,155 165,145');
            mouthElement.setAttribute('stroke-dasharray', '');
            mouthElement.setAttribute('stroke', '#333333');
            mouthElement.setAttribute('stroke-width', '2');
        }
    }, duration);
}
    
    // Function to add hand gestures based on words
    function addHandGesture(currentWord) {
        if (!robotSvg || !robotSvg.contentDocument) return;
        
        const svgDoc = robotSvg.contentDocument;
        const leftArmWave = svgDoc.getElementById('leftArmWave');
        const rightArmWave = svgDoc.getElementById('rightArmWave');
        
        if (!leftArmWave || !rightArmWave) return;
        
        // Temporarily stop the continuous hand movement
        if (handMovementInterval) {
            clearInterval(handMovementInterval);
            handMovementInterval = null;
        }
        
        // Words that might trigger pointing gesture
        const pointingWords = ['this', 'that', 'there', 'here', 'look', 'see', 'watch'];
        
        // Words that might trigger both hands gesture
        const bothHandsWords = ['everyone', 'all', 'everything', 'world', 'big', 'huge', 'massive'];
        
        // Words that might trigger waving gesture
        const wavingWords = ['hello', 'hi', 'hey', 'goodbye', 'bye', 'welcome'];
        
        let gestureTimeout = 1000; // Shorter timeout for gestures to keep movement more active
        
        if (pointingWords.some(word => currentWord.includes(word))) {
            // Pointing gesture with right arm
            rightArmWave.setAttribute('begin', '0s');
            setTimeout(() => {
                if (rightArmWave) rightArmWave.setAttribute('begin', 'indefinite');
                // Restart continuous hand movement after gesture
                startContinuousHandMovement();
            }, gestureTimeout);
        } else if (bothHandsWords.some(word => currentWord.includes(word))) {
            // Both hands out gesture
            leftArmWave.setAttribute('begin', '0s');
            rightArmWave.setAttribute('begin', '0s');
            setTimeout(() => {
                if (leftArmWave) leftArmWave.setAttribute('begin', 'indefinite');
                if (rightArmWave) rightArmWave.setAttribute('begin', 'indefinite');
                // Restart continuous hand movement after gesture
                startContinuousHandMovement();
            }, gestureTimeout);
        } else if (wavingWords.some(word => currentWord.includes(word))) {
            // Waving gesture
            let waveCount = 0;
            const maxWaves = 3;
            const waveInterval = setInterval(() => {
                if (waveCount >= maxWaves || !rightArmWave) {
                    clearInterval(waveInterval);
                    if (rightArmWave) rightArmWave.setAttribute('begin', 'indefinite');
                    // Restart continuous hand movement after gesture
                    startContinuousHandMovement();
                    return;
                }
                
                rightArmWave.setAttribute('begin', waveCount % 2 === 0 ? '0s' : 'indefinite');
                waveCount++;
            }, 300);
        } else {
            // If no specific gesture, restart the continuous hand movement
            startContinuousHandMovement();
        }
    }
    
    // Function to start mouth mumbling animation
function startMouthMumbling() {
    if (!robotSvg || !robotSvg.contentDocument) {
        console.error('Robot SVG not available for mouth mumbling');
        return;
    }
    
    const svgDoc = robotSvg.contentDocument;
    const mouthElement = svgDoc.getElementById('mouth');
    if (!mouthElement) {
        console.error('Mouth element not found in SVG');
        return;
    }
    
    console.log('Starting mouth mumbling animation');
    
    // Create a sequence of mouth movements to simulate digital robot speech
    const mouthSequence = [
        'M135,145 Q150,150 165,145', // slight movement
        'M135,145 Q150,160 165,145', // open a bit more
        'M135,145 Q150,155 165,145', // back to neutral
        'M135,145 Q150,158 165,145', // open again
        'M135,145 Q150,152 165,145',  // slight movement
        'M135,145 Q150,165 165,145', // wide open
        'M135,145 Q150,153 165,145'  // slight movement
    ];
    
    // Add a digital effect to the mouth
    mouthElement.setAttribute('stroke', '#0080FF');
    mouthElement.setAttribute('stroke-width', '2.5');
    
    // Apply the sequence with timing
    let sequenceIndex = 0;
    const mumbleInterval = setInterval(() => {
        if (!mouthElement || !document.body.contains(robotSvg) || !robot.classList.contains('talking')) {
            clearInterval(mumbleInterval);
            if (mouthElement) {
                mouthElement.setAttribute('d', 'M135,145 Q150,155 165,145');
                mouthElement.setAttribute('stroke-dasharray', '');
                mouthElement.setAttribute('stroke', '#333333');
                mouthElement.setAttribute('stroke-width', '2');
            }
            console.log('Stopping mouth mumbling animation');
            return;
        }
        
        // Digital effect - occasionally show a straight line for a more robotic feel
        if (Math.random() < 0.2) {
            mouthElement.setAttribute('d', 'M135,150 L165,150');
            mouthElement.setAttribute('stroke-dasharray', '2,1.5');
        } else {
            mouthElement.setAttribute('d', mouthSequence[sequenceIndex]);
            mouthElement.setAttribute('stroke-dasharray', '');
        }
        
        // Add occasional digital glitch effect
        if (Math.random() < 0.1) {
            mouthElement.setAttribute('stroke-dasharray', '3,1');
            setTimeout(() => {
                if (mouthElement && robot.classList.contains('talking')) {
                    mouthElement.setAttribute('stroke-dasharray', '');
                }
            }, 100);
        }
        
        sequenceIndex = (sequenceIndex + 1) % mouthSequence.length;
    }, 120); // Faster for more dynamic movement
}

// Add a welcome message in multiple languages
setTimeout(() => {
    const welcomeMessages = [
        "Hello! I am your chatbot avatar. Type any text, and I will speak it for you.",
        "नमस्ते! मैं आपका चैटबॉट अवतार हूँ। कोई भी टेक्स्ट टाइप करें, और मैं आपके लिए बोलूंगा।",
        "¡Hola! Soy tu avatar de chatbot. Escribe cualquier texto y lo diré por ti."
    ];
    
    // Choose a random welcome message to demonstrate multilingual capability
    const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    speak(randomMessage);
    
    // Display additional instructions
    setTimeout(() => {
        const instructionElement = document.createElement('p');
        instructionElement.textContent = "You can type in Hindi, English, Spanish, and other languages!";
        instructionElement.className = "instruction";
        document.querySelector('.chat-container').appendChild(instructionElement);
    }, 2000);
}, 1500);
});