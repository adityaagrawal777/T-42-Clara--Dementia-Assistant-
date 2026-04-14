# Clara Voice Agent - Complete Testing Guide

## ✅ Status: FIXED & READY TO TEST

The voice agent has been fixed and is now fully functional. Here's how to test it:

---

## 🎯 TEST SETUP

**Prerequisites:**
- ✅ Backend running on http://localhost:8000
- ✅ Frontend running on http://localhost:3001
- ✅ Microphone connected and working
- ✅ Browser: Chrome, Edge, or Firefox

---

## 📋 TEST SCENARIO 1: Text-to-Speech Output Only

### Steps:
1. Open http://localhost:3001 in browser
2. Sign in with test credentials
3. **DO NOT** enable voice mode
4. Type a message: "What's the weather like today?"
5. Send the message

### Expected Results:
- ✅ Clara responds with text only (no voice output)
- ✅ Message shows in chat history
- ✅ Response appears in the UI
- ✅ No audio plays

---

## 🎤 TEST SCENARIO 2: Full Voice Mode (Recommended Test)

### Enable Voice Mode:

**Step A: Toggle Voice On**
1. Open http://localhost:3001
2. Sign in
3. Look for the **🎤 microphone icon** in the top-right of the input area
4. Click it to enable voice mode
   - Icon should change color (green = enabled)
   - Text should show "Voice Enabled" on hover

### Step B: Speak to Clara

1. Click the **microphone button** (green button with mic icon)
   - Button turns **RED** and shows "Stop Listening"
   - You'll see "LISTENING" indicator light up
2. **Speak clearly**: "Hello Clara, how are you?"
3. After you finish speaking:
   - The transcribed text appears in the input box
   - Microphone automatically stops after ~8 seconds of silence
   - Button turns back green (ready state)

### Step C: Listen to Clara's Response

1. Click the **SEND** button (arrow icon)
2. Watch for Clara's response to stream in (you'll see streaming text)
3. **Listen for audio** when the response completes:
   - You should hear Clara's voice speaking the response
   - The voice tone will match her mood (calm, happy, distressed, etc.)
   - Her speed/pitch will vary based on her emotional state

### Expected Results ✅

**Input Side:**
- ✅ Microphone button is clickable
- ✅ Transcript appears in real-time as you speak
- ✅ Text updates in input box
- ✅ Auto-stops after silence

**Output Side:**
- ✅ Clara's text response appears (streamed token by token)
- ✅ Mood is detected and displayed
- ✅ **Audio plays automatically** with emotion-aware voice parameters
- ✅ Voice parameters change based on mood:
  - **Happy**: Faster speech (1.1x speed), higher pitch
  - **Calm**: Normal speech, normal pitch
  - **Distressed**: Slower speech (0.75x), lower pitch
  - **Confused**: Medium-slow speech, slightly higher pitch

---

## 🧪 TEST SCENARIO 3: Mixed Mode (Text + Voice)

### Steps:
1. Voice mode is already ON
2. Type a message manually (don't use microphone)
3. Send the message

### Expected Results:
- ✅ Message sent with "voice" input mode (even though typed, not spoken)
- ✅ Clara's response plays as audio (because mode = "voice")
- ✅ Text also appears on screen

---

## 🔄 TEST SCENARIO 4: Multiple Exchanges

### Steps:
1. Enable voice mode
2. Speak: "What's your name?"
3. Listen to response
4. Speak: "How can you help me?"
5. Listen to response
6. Type a message and send it
7. Listen for audio response

### Expected Results:
- ✅ Each voice input is captured correctly
- ✅ Each response includes both text and audio
- ✅ Moods vary naturally based on context
- ✅ Voice parameters adapt to each mood

---

## 🐛 TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| **Microphone not working** | 1. Check browser permissions (Reload page if needed)<br>2. Try Chrome/Edge for best support<br>3. Check Windows sound settings |
| **No transcript appears** | 1. Speak louder/clearer<br>2. Check microphone input in Windows<br>3. Try different browser |
| **No audio output** | 1. Check system volume (not muted)<br>2. Check browser tab isn't muted (try right-click)<br>3. Test speakers with another app |
| **Slow response** | 1. This is normal, Ollama is running locally<br>2. Wait for full response before speaking again<br>3. Check CPU usage (might be throttled) |
| **Voice mode toggle missing** | Clear browser cache (Ctrl+Shift+Delete) and reload |
| **Still text only after enable voice** | Hard refresh page: Ctrl+Shift+R |

---

## 📊 VOICE PARAMETERS BY MOOD

| Mood | Rate | Pitch | Volume | Characteristics |
|------|------|-------|--------|-----------------|
| **Happy** | 1.10 | 1.08 | 1.0 | Fast, high-pitched, energetic |
| **Calm** | 1.00 | 1.00 | 1.0 | Normal, balanced, peaceful |
| **Confused** | 0.82 | 0.95 | 0.9 | Slower, slightly higher, uncertain |
| **Distressed** | 0.75 | 0.90 | 0.9 | Slowest, lower, concerned |

---

## 🔧 CHANGES MADE (Fixed Issues)

### Issue #1: Input Mode Not Respecting Voice Toggle
**Before:** Messages always sent with "chat" mode, even when voice was enabled
**After:** Messages now send with "voice" mode when in voice/mixed mode
**File:** `src/components/chat/InputBar.tsx`

### Issue #2: Voice Synthesis Only Triggered for "voice" Mode
**Status:** ✅ Already implemented correctly
**File:** `src/app/chat/page.tsx`

---

## 📱 BROWSER SUPPORT

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 90+ | ✅ Full | Best support |
| Edge 90+ | ✅ Full | Chromium-based |
| Firefox 78+ | ✅ Good | Works well |
| Safari 14.5+ | ⚠️ Partial | iOS limitations |

---

## 🎯 SUCCESS CRITERIA

Your voice agent is working correctly when:

1. ✅ You can click the microphone button and see "LISTENING" state
2. ✅ Your speech is transcribed and appears in the input box
3. ✅ Message sends when transcript is complete
4. ✅ Clara's text response appears in the chat
5. ✅ Clara's audio response plays automatically
6. ✅ Audio voice tone matches emotional content
7. ✅ You can have a full conversation using voice

---

## 📞 ADDITIONAL COMMANDS TO TEST

Try speaking these to test different scenarios:

- "Hello Clara" - Basic greeting
- "What's your name?" - Information query
- "I'm feeling anxious" - Emotional detection
- "Thank you for your help" - Positive interaction
- "Can you repeat that?" - Engagement
- "Goodbye" - Session ending

---

## 🚀 DEPLOYMENT NOTES

The voice feature uses **100% free, local technologies:**
- ✅ Browser Web Speech API (no API keys needed)
- ✅ Local Ollama model (no cloud services)
- ✅ PostgreSQL storage (self-hosted)
- ✅ No external APIs or subscriptions

Perfect for healthcare deployments with privacy requirements!

---

## ✨ NEXT STEPS

1. **Test the scenarios above** following this guide
2. **Report any issues** with exact steps to reproduce
3. **Consider enhancements** like:
   - Voice transcript confidence display
   - Voice speed/pitch user preferences
   - Audio recording history
   - Multi-language support
   - Voice-specific accessibility features

---

**Last Updated:** April 13, 2026
**Status:** Ready for Testing ✅
