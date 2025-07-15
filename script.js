// Elementos HTML
const chat = document.getElementById('chat');
const input = document.getElementById('inputMessage');
const sendButton = document.getElementById('sendButton');
const attachImageButton = document.getElementById('attachImage');
const imageInput = document.getElementById('imageInput');
const fileInfo = document.getElementById('fileInfo');
const removeImageButton = document.getElementById('removeImage');

// Configuração da API
const GEMINI_API_KEY = 'AIzaSyAVP2Y1MdM34qJa24I1ueSkDukifTZ_dZ0';
const MODEL = 'gemini-2.5-flash';

let selectedImage = null;

function appendMessage(content, sender, isImage = false) {
  const div = document.createElement('div');
  div.classList.add('message', sender);

  if (isImage) {
    const img = document.createElement('img');
    img.src = content;
    img.alt = "Imagem enviada";
    img.style.maxWidth = '100%';
    img.style.borderRadius = '8px';
    div.appendChild(img);
  } else {
    div.textContent = content;
  }

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

async function sendMessage() {
  const message = input.value.trim();
  
  if (!message && !selectedImage) {
    return alert("Digite uma mensagem ou anexe uma imagem.");
  }

  if (message) appendMessage(message, 'user');
  if (selectedImage) appendMessage(selectedImage, 'user', true);

  try {
    const parts = [];
    
    if (selectedImage) {
      const base64Data = selectedImage.split(',')[1];
      const mimeType = imageInput.files[0]?.type || 'image/jpeg';
    
      if (!base64Data || !mimeType.startsWith('image/')) {
        throw new Error('Dados da imagem inválidos');
      }
      
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    }
    
    if (message) {
      parts.push({ text: message });
    } else if (selectedImage) {
      parts.push({ text: "Descreva esta imagem." });
    }

    input.value = '';
    const imageToSend = selectedImage;
    clearImageSelection();

    const response = await fetchGeminiAPI(parts);
    appendMessage(response || 'Nenhuma resposta gerada.', 'bot');
    
  } catch (err) {
    console.error('Erro:', err);
    appendMessage('Erro: ' + (err.message || 'Falha ao processar sua solicitação'), 'bot');
    
    if (message) input.value = message;
  }
}

async function fetchGeminiAPI(parts) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: parts
        }],
        generationConfig: {
          maxOutputTokens: 2048
        }
      })
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    console.error('Erro na API Gemini:', data);
    throw new Error(data.error?.message || `Erro na API: ${response.status}`);
  }

  if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
    throw new Error('Resposta da API não contém texto válido');
  }

  return data.candidates[0].content.parts[0].text;
}

function handleImageSelection() {
  const file = imageInput.files[0];
  
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    alert('Por favor, selecione um arquivo de imagem válido.');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('A imagem é muito grande. Por favor, selecione uma imagem menor que 5MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(event) {
    selectedImage = event.target.result;
    fileInfo.textContent = `Imagem selecionada: ${file.name}`;
    removeImageButton.style.display = 'inline-block';
  };
  reader.readAsDataURL(file);
}

function clearImageSelection() {
  imageInput.value = '';
  selectedImage = null;
  fileInfo.textContent = '';
  removeImageButton.style.display = 'none';
}

// Event listeners
sendButton.addEventListener('click', sendMessage);
attachImageButton.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', handleImageSelection);
removeImageButton.addEventListener('click', clearImageSelection);

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});