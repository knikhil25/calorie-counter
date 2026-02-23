import { useState, useRef, useEffect } from 'react';

let messageIdCounter = 0;
function nextMessageId() {
  return `msg-${Date.now()}-${++messageIdCounter}`;
}

function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (role, content, data = null) => {
    setMessages((prev) => [...prev, { role, content, data, id: nextMessageId() }]);
  };

  const processImageFile = (file) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setImagePreview(result);
        setImageBase64(result.replace(/^data:image\/[a-z]+;base64,/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    fileInputRef.current?.value && (fileInputRef.current.value = '');
  };

  const handlePaste = (e) => {
    const item = e.clipboardData?.items?.[0];
    if (item?.type?.startsWith('image/')) {
      e.preventDefault();
      processImageFile(item.getAsFile());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if ((!text && !imageBase64) || loading) return;

    const userContent = text || (imagePreview ? '📷 Photo of my meal' : '');
    const imageToSend = imageBase64;
    const previewUrl = imagePreview;
    setInput('');
    setImagePreview(null);
    setImageBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    addMessage('user', userContent, imageToSend ? { hasImage: true, previewUrl } : null);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text || 'What are the calories in this meal?',
          ...(imageToSend && { image: imageToSend })
        })
      });

      const textBody = await res.text();
      let data;
      try {
        data = JSON.parse(textBody);
      } catch {
        data = {};
      }
      if (!res.ok) throw new Error(data.error || res.statusText || 'Request failed');

      if (data.type === 'calorie_count') {
        addMessage('assistant', data.message, { dailyTotal: data.dailyTotal });
      } else if (data.type === 'unrecognized') {
        addMessage('assistant', data.message || "I'm sorry, I didn't recognize this meal. Would you please elaborate?");
      } else if (data.type === 'last_meal') {
        let msg = `**${data.mealCalories}** cal for that meal.\n\nDay total saved: **${data.dayTotal}** calories. Counter reset for tomorrow.`;
        if (data.breakdown) msg += `\n\n${data.breakdown}`;
        addMessage('assistant', msg, {
          mealCalories: data.mealCalories,
          dayTotal: data.dayTotal,
          daySaved: data.daySaved
        });
      } else {
        let msg = `**${data.mealCalories}** calories.\n\nToday's total: **${data.dailyTotal}**`;
        if (data.breakdown) msg += `\n\n${data.breakdown}`;
        addMessage('assistant', msg, {
          mealCalories: data.mealCalories,
          dailyTotal: data.dailyTotal
        });
      }
    } catch (err) {
      addMessage('assistant', `❌ ${err.message}`, { error: true });
    } finally {
      setLoading(false);
    }
  };

  const formatMessage = (text) => {
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={j} className="font-semibold text-sage-800">{part.slice(2, -2)}</strong>
          ) : (
            part
          )
        )}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="animate-fade-in text-center py-12 px-4">
            <p className="text-sage-500 text-sm mb-2">What did you eat?</p>
            <p className="text-sage-400 text-xs max-w-xs mx-auto">
              Try: &quot;2 eggs and toast&quot; or &quot;4 Chick-fil-A chicken strips&quot;
            </p>
            <p className="text-sage-400 text-xs mt-4">
              Or type &quot;calorie count&quot; for today&apos;s total
            </p>
            <p className="text-sage-400 text-xs mt-1">
              &quot;Last meal: &lt;food&gt;&quot; to save the day and reset
            </p>
            <p className="text-sage-400 text-xs mt-4">
              📷 Paste or upload a photo of your meal for AI analysis
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex animate-slide-up ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                m.role === 'user'
                  ? 'bg-sage-600 text-white rounded-br-md'
                  : m.data?.error
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-white text-sage-700 shadow-sm border border-sage-100 rounded-bl-md'
              }`}
            >
              {m.data?.hasImage && m.data?.previewUrl && (
                <div className="mb-2 rounded-lg overflow-hidden max-w-[200px]">
                  <img src={m.data.previewUrl} alt="Meal" className="w-full h-auto object-cover" />
                </div>
              )}
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {formatMessage(m.content)}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-sage-100">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sage-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-sage-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-sage-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 p-4 bg-white/60 border-t border-sage-200/60">
        {imagePreview && (
          <div className="mb-3 flex items-center gap-2 animate-fade-in">
            <div className="relative">
              <img
                src={imagePreview}
                alt="Meal preview"
                className="w-14 h-14 rounded-lg object-cover border border-sage-200"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-sage-600 text-white flex items-center justify-center text-xs hover:bg-sage-700"
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
            <span className="text-sage-500 text-sm">Photo ready — add text if needed, then send</span>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => e.target.files?.[0] && processImageFile(e.target.files[0])}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="shrink-0 p-3 rounded-xl border border-sage-200 bg-white text-sage-600 hover:bg-sage-50 disabled:opacity-50"
            aria-label="Add photo"
            title="Add photo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={handlePaste}
            placeholder="What did you eat? Say 'Last meal: (food)' for your final meal of the day"
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl border border-sage-200 bg-white focus:outline-none focus:ring-2 focus:ring-sage-400/50 focus:border-sage-400 text-sage-800 placeholder-sage-400 text-base disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || (!input.trim() && !imageBase64)}
            className="px-5 py-3 rounded-xl bg-sage-600 text-white font-medium hover:bg-sage-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatScreen;
