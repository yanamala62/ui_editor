import { useAIStore } from '../store';
import axios from 'axios';

export function useAI() {
  const ai = useAIStore();

  async function suggest(elementInfo, request) {
    ai.setLoading(true);
    try {
      if (window.electronAPI?.aiSuggest) {
        const res = await window.electronAPI.aiSuggest(elementInfo, request);
        ai.setSuggestions(res.suggestions || []);
        return res;
      }
      const res = await axios.post('http://localhost:3001/api/ai/suggest', { elementInfo, userRequest: request });
      ai.setSuggestions(res.data.suggestions || []);
      return res.data;
    } catch (e) {
      ai.setError(e.message);
      return null;
    }
  }

  async function chat(message) {
    ai.setLoading(true);
    ai.addChatMessage({ role: 'user', content: message });
    try {
      const res = await axios.post('http://localhost:3001/api/ai/chat', { messages: [{ role: 'user', content: message }] });
      ai.addChatMessage({ role: 'assistant', content: res.data.response });
      ai.setLoading(false);
      return res.data.response;
    } catch (e) {
      ai.setError(e.message);
      return null;
    }
  }

  return { suggest, chat, ...ai };
}
