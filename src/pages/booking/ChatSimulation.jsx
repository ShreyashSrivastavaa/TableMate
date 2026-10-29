import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  MessageCircle,
  HelpCircle,
  ArrowRight,
  Info,
  CheckCheck,
  Bot,
  User,
  ExternalLink,
} from 'lucide-react';
import { repository } from '../../services/reservationRepository';
import { getAvailableSlotsForDate } from '../../domain/availability';
import {
  handleChatMessage,
  getInitialChatState,
  CHAT_STEPS,
} from '../../domain/chatParser';
import { LocalChatAdapter } from '../../services/channelAdapter';
import { useToast } from '../../context/ToastContext';

export default function ChatSimulation({ restaurantSettings, onSwitchToForm, onSuccess }) {
  const [tables, setTables] = useState(() => repository.getTables());
  const [reservations, setReservations] = useState(() => repository.list());
  const [chatState, setChatState] = useState(() => getInitialChatState(restaurantSettings));
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const chatBottomRef = useRef(null);
  const { showToast } = useToast();

  // Create channel adapter instance with callback
  const adapterRef = useRef(null);
  if (!adapterRef.current) {
    adapterRef.current = new LocalChatAdapter((incomingMsg) => {
      setMessages((prev) => [...prev, incomingMsg]);
    });
  }

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial bot greeting
  useEffect(() => {
    const greeting =
      restaurantSettings.welcomeMessage ||
      `Hello! Welcome to ${restaurantSettings.restaurantName}. How many guests will be dining with us? (e.g. "table for 2")`;

    adapterRef.current.send('local-demo-user', greeting);
  }, [restaurantSettings]);

  // Sync tables and reservations from repository
  useEffect(() => {
    const unsubscribe = repository.subscribe(() => {
      setTables(repository.getTables());
      setReservations(repository.list());
    });
    return unsubscribe;
  }, []);

  const handleSend = (textToSend = inputText) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    // 1. Log user message via ChannelAdapter
    const userPayload = adapterRef.current.receive(trimmed);
    const userMsg = {
      id: 'user-' + Date.now(),
      sender: 'user',
      userId: userPayload.userId,
      text: userPayload.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    // 2. Process message through deterministic state machine
    setTimeout(() => {
      const response = handleChatMessage({
        message: userPayload.text,
        state: chatState,
        settings: restaurantSettings,
        availableSlotsForDateFn: (date, guests) => {
          return getAvailableSlotsForDate(
            date,
            guests,
            repository.getTables(),
            repository.list(),
            restaurantSettings
          );
        },
        saveReservationFn: (resData) => {
          return repository.create(resData);
        },
      });

      // Update state machine
      setChatState(response.newState);

      // Dispatch bot reply through ChannelAdapter
      adapterRef.current.send('local-demo-user', response.botReply);

      // Check actions
      if (response.action === 'REDIRECT_FORM') {
        onSwitchToForm();
      } else if (response.action === 'BOOKING_CREATED') {
        showToast(`Reservation request created! Ref: ${response.newState.createdReservation.reference}`, 'success');
        if (onSuccess) {
          setTimeout(() => onSuccess(response.newState.createdReservation), 1500);
        }
      }
    }, 250);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick suggestion chips based on current step
  const renderQuickChips = () => {
    switch (chatState.step) {
      case CHAT_STEPS.ASK_GUESTS:
        return ['2 guests', '4 guests', '6 guests', 'Table for 8'];
      case CHAT_STEPS.ASK_DATE:
        return ['today', 'tomorrow', 'Friday', 'Saturday'];
      case CHAT_STEPS.ASK_TIME:
        return ['7:30 pm', '8:00 pm', '8:30 pm', '1:30 pm'];
      case CHAT_STEPS.CONFIRM:
        return ['YES, confirm', 'EDIT details'];
      default:
        return [];
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-w-xl mx-auto flex flex-col h-[650px]">
      {/* WhatsApp Simulation Top Bar */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-inner">
            {restaurantSettings.restaurantName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm leading-tight text-white">
                {restaurantSettings.restaurantName}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
              <span className="text-[11px] text-emerald-300 font-medium">
                Simulation, not WhatsApp, not AI
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onSwitchToForm}
          className="text-xs font-semibold px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
          title="Switch to standard form"
        >
          <span>Use Form</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Disclaimers & Adapter shape notice */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-[11px] text-amber-900 flex items-start gap-2">
        <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
        <span>
          <strong>State Machine Channel Adapter:</strong> Simulates deterministic conversation via <code>ChannelAdapter</code>. No OpenAI or live WhatsApp token needed. Type <strong>form</strong> anytime to escape.
        </span>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5]/30">
        {messages.map((m) => {
          const isBot = m.sender === 'bot';
          return (
            <div
              key={m.id}
              className={`flex ${isBot ? 'justify-start' : 'justify-end'} animate-in fade-in duration-150`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-sm ${
                  isBot
                    ? 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
                    : 'bg-emerald-600 text-white rounded-tr-none'
                }`}
              >
                <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                <div
                  className={`text-[10px] mt-1 text-right flex items-center justify-end gap-1 ${
                    isBot ? 'text-slate-400' : 'text-emerald-100'
                  }`}
                >
                  <span>{m.timestamp}</span>
                  {!isBot && <CheckCheck className="w-3 h-3 text-emerald-200" />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatBottomRef} />
      </div>

      {/* Quick Suggestion Chips */}
      {renderQuickChips().length > 0 && (
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
            Quick:
          </span>
          {renderQuickChips().map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(chip)}
              className="px-2.5 py-1 text-xs font-medium rounded-full bg-white hover:bg-indigo-50 border border-slate-300 hover:border-indigo-400 text-slate-700 hover:text-indigo-700 whitespace-nowrap transition-colors shadow-2xs"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input Field & Send Button */}
      <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        <input
          type="text"
          placeholder="Type message (or 'form' to switch)..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!inputText.trim()}
          className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
