// Obtém referências aos elementos HTML
const chat = document.getElementById('chat'); // Área de exibição das mensagens
const input = document.getElementById('inputMessage'); // Campo de entrada de texto
const sendButton = document.getElementById('sendButton'); // Botão de enviar
const attachImageButton = document.getElementById('attachImage'); // Botão para anexar imagem
const imageInput = document.getElementById('imageInput'); // Input de arquivo oculto para imagens
const fileInfo = document.getElementById('fileInfo'); // Elemento para mostrar informações do arquivo
const removeImageButton = document.getElementById('removeImage'); // Botão para remover imagem selecionada

// Configuração da API Gemini
const GEMINI_API_KEY = 'AIzaSyAVP2Y1MdM34qJa24I1ueSkDukifTZ_dZ0'; // Chave de API
const MODEL = 'gemini-2.5-flash'; // Modelo do Gemini que suporta imagens

// Variável para armazenar a imagem selecionada como URL de dados (data URL)
let selectedImage = null;

// Função para adicionar mensagens ao chat
function appendMessage(content, sender, isImage = false) {
  // Cria um novo elemento div para a mensagem
  const div = document.createElement('div');
  // Adiciona classes CSS (message e a classe do remetente - user/bot)
  div.classList.add('message', sender);

  // Se for uma imagem
  if (isImage) {
    // Cria um elemento img
    const img = document.createElement('img');
    img.src = content; // Define a fonte da imagem
    img.alt = "Imagem enviada"; // Texto alternativo
    img.style.maxWidth = '100%'; // Limita a largura
    img.style.borderRadius = '8px'; // Bordas arredondadas
    div.appendChild(img); // Adiciona a imagem à div
  } else {
    // Se for texto, define o conteúdo da div
    div.textContent = content;
  }

  // Adiciona a mensagem ao chat
  chat.appendChild(div);
  // Rola o chat para a parte inferior
  chat.scrollTop = chat.scrollHeight;
}

// Função principal para enviar mensagem
async function sendMessage() {
  // Obtém e limpa o texto da mensagem
  const message = input.value.trim();
  
  // Verifica se há conteúdo para enviar (texto ou imagem)
  if (!message && !selectedImage) {
    return alert("Digite uma mensagem ou anexe uma imagem.");
  }

  // Mostra a mensagem do usuário no chat (se existir)
  if (message) {
    appendMessage(message, 'user');
  }
  
  // Mostra a imagem no chat (se existir)
  if (selectedImage) {
    appendMessage(selectedImage, 'user', true);
  }

  try {
    // Array para armazenar as partes da mensagem (texto e/ou imagem)
    const parts = [];
    
    // Processa a imagem se existir
    if (selectedImage) {
      // Extrai os dados base64 (remove o prefixo data:image/...)
      const base64Data = selectedImage.split(',')[1];
      // Obtém o tipo MIME do arquivo ou usa um fallback
      const mimeType = imageInput.files[0]?.type || 'image/jpeg';
    
      // Valida os dados da imagem
      if (!base64Data || !mimeType.startsWith('image/')) {
        throw new Error('Dados da imagem inválidos');
      }
      
      // Adiciona a imagem ao array de partes
      parts.push({
        inlineData: {
          mimeType: mimeType, // Tipo da imagem
          data: base64Data // Dados em base64
        }
      });
    }
    
    // Processa o texto se existir
    if (message) {
      parts.push({ text: message });
    } else if (selectedImage) {
      // Se só tiver imagem, usa um prompt padrão
      parts.push({ text: "Descreva esta imagem." });
    }

    // Verificação final de segurança
    if (parts.length === 0) {
      throw new Error('Nenhum conteúdo válido para enviar');
    }

    // Limpa os campos de entrada
    input.value = '';
    const imageToSend = selectedImage;
    clearImageSelection();

    // Chama a API do Gemini e mostra a resposta
    const response = await fetchGeminiAPI(parts);
    appendMessage(response || 'Nenhuma resposta gerada.', 'bot');
    
  } catch (err) {
    console.error('Erro:', err);
    // Mostra mensagem de erro no chat
    appendMessage('Erro: ' + (err.message || 'Falha ao processar sua solicitação'), 'bot');
    
    // Restaura a mensagem do usuário em caso de erro
    if (message) {
      input.value = message;
    }
  }
}

// Função para chamar a API do Gemini
async function fetchGeminiAPI(parts) {
  try {
    // Faz a requisição para a API do Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user', // Define o papel como usuário
            parts: parts // Partes da mensagem (texto/imagem)
          }],
          generationConfig: {
            maxOutputTokens: 2048 // Limite de tokens na resposta
          }
        })
      }
    );

    // Processa a resposta JSON
    const data = await response.json();
    
    // Trata erros da API
    if (!response.ok) {
      console.error('Erro na API Gemini:', data);
      throw new Error(data.error?.message || `Erro na API: ${response.status}`);
    }

    // Verifica se a resposta contém conteúdo válido
    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
      throw new Error('Resposta da API não contém texto válido');
    }

    // Retorna o texto gerado
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Erro na chamada da API:', error);
    throw error;
  }
}

// Função para processar a seleção de imagem
function handleImageSelection() {
  // Obtém o arquivo selecionado
  const file = imageInput.files[0];
  
  if (!file) return;
  
  // Verifica se é uma imagem
  if (!file.type.startsWith('image/')) {
    alert('Por favor, selecione um arquivo de imagem válido.');
    return;
  }

  // Verifica o tamanho do arquivo (limite de 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('A imagem é muito grande. Por favor, selecione uma imagem menor que 5MB.');
    return;
  }

  // Lê o arquivo como URL de dados
  const reader = new FileReader();
  reader.onload = function(event) {
    // Armazena a imagem e atualiza a UI
    selectedImage = event.target.result;
    fileInfo.textContent = `Imagem selecionada: ${file.name}`;
    removeImageButton.style.display = 'inline-block';
  };
  reader.readAsDataURL(file);
}

// Função para limpar a seleção de imagem
function clearImageSelection() {
  imageInput.value = ''; // Limpa o input de arquivo
  selectedImage = null; // Reseta a variável
  fileInfo.textContent = ''; // Limpa a informação do arquivo
  removeImageButton.style.display = 'none'; // Esconde o botão de remover
}

// Configuração dos event listeners

// Enviar mensagem ao clicar no botão
sendButton.addEventListener('click', sendMessage);

// Simular clique no input de arquivo ao clicar no botão de anexar
attachImageButton.addEventListener('click', () => imageInput.click());

// Processar seleção de imagem quando o arquivo mudar
imageInput.addEventListener('change', handleImageSelection);

// Remover imagem selecionada
removeImageButton.addEventListener('click', clearImageSelection);

// Enviar mensagem ao pressionar Enter (sem Shift)
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault(); // Previne o comportamento padrão
    sendMessage();
  }
});