import { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { advisoryClient } from "../lib/api";

const FarmerHelper = ({ onQuestionSelect }) => {
  const { currentLanguage } = useLanguage();
  const [showAllExamples, setShowAllExamples] = useState(false);
  const [randomExamples, setRandomExamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [useRandomExamples, setUseRandomExamples] = useState(false);

  const allQuestions = {
    en: [
      "My crop leaves are turning yellow, what should I do?",
      "When is the best time to plant rice?",
      "How to control pests in vegetables?",
      "What fertilizer should I use for coconut trees?",
      "My tomato plants are wilting, help me",
      "How much water does paddy need?",
      "Best organic pesticides for crops?",
      "How to improve soil fertility naturally?",
      "When to harvest vegetables?",
      "Crop rotation benefits and methods?",
      "How to prevent fungal diseases?",
      "Best seeds for monsoon planting?"
    ],
    ml: [
      "എന്റെ വിളയുടെ ഇലകൾ മഞ്ഞയായി മാറുന്നു, എന്ത് ചെയ്യണം?",
      "നെല്ല് നടാൻ ഏറ്റവും നല്ല സമയം എപ്പോഴാണ്?",
      "പച്ചക്കറികളിലെ കീടങ്ങളെ എങ്ങനെ നിയന്ത്രിക്കാം?",
      "തെങ്ങിന് ഏത് വളം ഉപയോഗിക്കണം?",
      "എന്റെ തക്കാളി ചെടികൾ വാടുന്നു, സഹായിക്കുക",
      "നെല്ലിന് എത്ര വെള്ളം വേണം?",
      "വിളകൾക്ക് ഏറ്റവും നല്ല ജൈവ കീടനാശിനി?",
      "മണ്ണിന്റെ ഫലഭൂയിഷ്ഠത സ്വാഭാവികമായി വർദ്ധിപ്പിക്കാൻ?",
      "പച്ചക്കറികൾ എപ്പോൾ വിളവെടുക്കണം?",
      "വിള മാറ്റിക്കൃഷിയുടെ ഗുണങ്ങളും രീതികളും?",
      "ഫംഗസ് രോഗങ്ങൾ എങ്ങനെ തടയാം?",
      "മൺസൂൺ നടീലിന് ഏറ്റവും നല്ല വിത്തുകൾ?"
    ],
    hi: [
      "मेरी फसल की पत्तियां पीली हो रही हैं, क्या करूं?",
      "धान लगाने का सबसे अच्छा समय कब है?",
      "सब्जियों में कीड़ों को कैसे नियंत्रित करें?",
      "नारियल के पेड़ों के लिए कौन सा खाद इस्तेमाल करूं?",
      "मेरे टमाटर के पौधे मुरझा रहे हैं, मदद करें",
      "धान को कितना पानी चाहिए?",
      "फसलों के लिए सबसे अच्छा जैविक कीटनाशक?",
      "मिट्टी की उर्वरता प्राकृतिक रूप से कैसे बढ़ाएं?",
      "सब्जियों की कटाई कब करें?",
      "फसल चक्र के फायदे और तरीके?",
      "फंगल रोगों को कैसे रोकें?",
      "मानसून की बुआई के लिए सबसे अच्छे बीज?"
    ],
  };



  const INSTRUCTIONS = {
    en: {
      voice: "Click the microphone and speak clearly in English or Malayalam",
      image: "Take a clear photo of your crop, leaf, or plant problem",
      text: "Type your question in simple words",
    },
    ml: {
      voice:
        "മൈക്രോഫോണിൽ ക്ലിക്ക് ചെയ്ത് ഇംഗ്ലീഷിലോ മലയാളത്തിലോ വ്യക്തമായി സംസാരിക്കുക",
      image:
        "നിങ്ങളുടെ വിള, ഇല, അല്ലെങ്കിൽ ചെടിയുടെ പ്രശ്നത്തിന്റെ വ്യക്തമായ ഫോട്ടോ എടുക്കുക",
      text: "ലളിതമായ വാക്കുകളിൽ നിങ്ങളുടെ ചോദ്യം ടൈപ്പ് ചെയ്യുക",
    },
    hi: {
      voice: "माइक्रोफोन पर क्लिक करें और हिंदी या अंग्रेजी में साफ-साफ बोलें",
      image: "अपनी फसल, पत्ती, या पौधे की समस्या की साफ तस्वीर लें",
      text: "सरल शब्दों में अपना सवाल टाइप करें",
    },
  };

  useEffect(() => {
    if (useRandomExamples) {
      generateRandomExamples();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage, useRandomExamples]);

  const generateRandomExamples = async () => {
    setLoading(true);
    try {
      const prompt = `Generate 8 short farming questions in ${currentLanguage === 'ml' ? 'Malayalam' : currentLanguage === 'hi' ? 'Hindi' : 'English'} language. Focus on crop diseases, fertilizers, planting times, pest control, and general farming advice. Return only the questions, one per line.`;
      
      const response = await advisoryClient.generateResponse(prompt, currentLanguage);
      const questions = response.response.split('\n').filter(q => q.trim()).slice(0, 8);
      setRandomExamples(questions.length > 0 ? questions : allQuestions[currentLanguage] || []);
    } catch (error) {
      setRandomExamples(allQuestions[currentLanguage] || []);
    }
    setLoading(false);
  };

  const currentQuestions = useRandomExamples ? randomExamples : (allQuestions[currentLanguage] || []);
  const displayedQuestions = showAllExamples 
    ? currentQuestions
    : currentQuestions.slice(0, 2);

  return (
    <div className="farmer-helper-external">
      <div className="examples-header">
        <h4>💡 Quick Examples</h4>
        <div className="header-controls">
          <button 
            className="random-toggle-btn"
            onClick={() => setUseRandomExamples(!useRandomExamples)}
          >
            {useRandomExamples ? '🎲' : '📋'}
          </button>
          <button 
            className="expand-btn"
            onClick={() => setShowAllExamples(!showAllExamples)}
          >
            {showAllExamples ? 'Less' : 'More'}
          </button>
        </div>
      </div>
      
      <div className="examples-grid">
        {loading ? (
          <div className="loading-examples">Generating examples...</div>
        ) : (
          displayedQuestions.map((question, index) => (
            <button
              key={index}
              className="example-btn"
              onClick={() => onQuestionSelect(question)}
            >
              {question}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default FarmerHelper;
