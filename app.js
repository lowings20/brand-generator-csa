// Brand Generator App

const ANTHROPIC_KEY_STORAGE = 'brand_anthropic_key';
const OPENAI_KEY_STORAGE = 'brand_openai_key';

// Store current brand data for regeneration
let currentBrand = {
  name: '',
  tagline: '',
  description: ''
};

// Fun loading messages
const loadingMessages = [
  "Brewing up something special...",
  "Consulting the brand wizards...",
  "Mixing creativity with strategy...",
  "Crafting your brand identity...",
  "Sprinkling some magic dust...",
  "Aligning the stars for your brand...",
  "Channeling entrepreneurial energy...",
  "Making it memorable...",
  "Adding that special sauce...",
  "Almost there, making it perfect..."
];

// Get API keys
function getAnthropicKey() {
  return localStorage.getItem(ANTHROPIC_KEY_STORAGE);
}

function getOpenAIKey() {
  return localStorage.getItem(OPENAI_KEY_STORAGE);
}

// Modal functions
function openModal() {
  const modal = document.getElementById('api-modal');
  document.getElementById('anthropic-key-input').value = getAnthropicKey() || '';
  document.getElementById('openai-key-input').value = getOpenAIKey() || '';
  modal.classList.add('open');
}

function closeModal() {
  document.getElementById('api-modal').classList.remove('open');
}

function saveApiKeys() {
  const anthropicKey = document.getElementById('anthropic-key-input').value.trim();
  const openaiKey = document.getElementById('openai-key-input').value.trim();

  if (anthropicKey) localStorage.setItem(ANTHROPIC_KEY_STORAGE, anthropicKey);
  else localStorage.removeItem(ANTHROPIC_KEY_STORAGE);

  if (openaiKey) localStorage.setItem(OPENAI_KEY_STORAGE, openaiKey);
  else localStorage.removeItem(OPENAI_KEY_STORAGE);

  closeModal();
}

// Update loading text with fun messages
function startLoadingAnimation() {
  let index = 0;
  const loadingText = document.getElementById('loading-text');

  return setInterval(() => {
    index = (index + 1) % loadingMessages.length;
    loadingText.textContent = loadingMessages[index];
  }, 2000);
}

// Show/hide sections
function showSection(sectionId) {
  document.getElementById('input-section').classList.add('hidden');
  document.getElementById('loading-section').classList.add('hidden');
  document.getElementById('results-section').classList.add('hidden');
  document.getElementById(sectionId).classList.remove('hidden');
}

// Generate brand
async function generateBrand() {
  const description = document.getElementById('business-input').value.trim();

  if (!description) {
    alert("Tell us about your business idea first! Don't be shy.");
    return;
  }

  const anthropicKey = getAnthropicKey();
  const openaiKey = getOpenAIKey();

  if (!anthropicKey || !openaiKey) {
    openModal();
    return;
  }

  currentBrand.description = description;

  showSection('loading-section');
  const loadingInterval = startLoadingAnimation();

  try {
    // Step 1: Generate name and tagline with Claude
    const brandData = await generateBrandText(description, anthropicKey);
    currentBrand.name = brandData.name;
    currentBrand.tagline = brandData.tagline;

    // Step 2: Generate logo with DALL-E
    const logoUrl = await generateLogo(brandData.name, brandData.tagline, description, openaiKey);

    // Display results
    clearInterval(loadingInterval);
    displayResults(brandData.name, brandData.tagline, logoUrl);

  } catch (error) {
    clearInterval(loadingInterval);
    console.error('Error:', error);
    alert(`Oops! Something went wrong: ${error.message}`);
    showSection('input-section');
  }
}

// Generate brand name and tagline using Claude
async function generateBrandText(description, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `You're a creative branding expert with a playful spirit. Based on this business idea, generate a brand name and tagline.

Business idea: "${description}"

Create something memorable, catchy, and fitting for the business. Match the energy and playfulness of how they described their idea. If they're serious, be polished. If they're fun, be fun!

Respond in JSON format only:
{
  "name": "The Brand Name",
  "tagline": "A catchy tagline that captures the essence"
}`
      }]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to generate brand text');
  }

  const data = await response.json();
  const text = data.content[0].text;

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Could not parse brand data');
}

// Generate logo using DALL-E
async function generateLogo(name, tagline, description, apiKey) {
  const prompt = `A modern, professional logo design for a brand called "${name}". The brand is about: ${description}. Style: Clean, memorable, suitable for a startup. The logo should be iconic and work well at any size. White or transparent background. No text in the image, just the logo mark/symbol.`;

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to generate logo');
  }

  const data = await response.json();
  return data.data[0].url;
}

// Display results
function displayResults(name, tagline, logoUrl) {
  document.getElementById('brand-name').textContent = name;
  document.getElementById('brand-tagline').textContent = `"${tagline}"`;
  document.getElementById('brand-logo').src = logoUrl;

  // Hide flagship section when showing new brand
  document.getElementById('flagship-section').classList.add('hidden');

  showSection('results-section');
}

// Regenerate brand
async function regenerate() {
  if (currentBrand.description) {
    document.getElementById('business-input').value = currentBrand.description;
    await generateBrand();
  }
}

// Show flagship product
async function showFlagshipProduct() {
  const openaiKey = getOpenAIKey();
  const anthropicKey = getAnthropicKey();

  if (!openaiKey || !anthropicKey) {
    openModal();
    return;
  }

  const flagshipBtn = document.getElementById('flagship-btn');
  flagshipBtn.disabled = true;
  flagshipBtn.innerHTML = '<span class="btn-icon">⏳</span> Creating your product...';

  try {
    // Generate product description with Claude
    const productData = await generateProductDescription(anthropicKey);

    // Generate product image with DALL-E
    const productUrl = await generateProductImage(productData.description, openaiKey);

    // Display flagship product
    document.getElementById('flagship-product').src = productUrl;
    document.getElementById('product-description').textContent = productData.pitch;
    document.getElementById('flagship-section').classList.remove('hidden');

    // Scroll to flagship section
    document.getElementById('flagship-section').scrollIntoView({ behavior: 'smooth' });

  } catch (error) {
    console.error('Error:', error);
    alert(`Couldn't create the product: ${error.message}`);
  } finally {
    flagshipBtn.disabled = false;
    flagshipBtn.innerHTML = '<span class="btn-icon">🚀</span> SHOW ME OUR FLAGSHIP PRODUCT';
  }
}

// Generate product description
async function generateProductDescription(apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `You're creating a flagship product for this brand:

Brand Name: ${currentBrand.name}
Brand Tagline: ${currentBrand.tagline}
Business: ${currentBrand.description}

Create a flagship product that would be the hero of this brand's lineup.

Respond in JSON format:
{
  "description": "A detailed visual description for generating an image of the product (be specific about colors, materials, style)",
  "pitch": "A one-sentence exciting pitch for this product"
}`
      }]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to generate product idea');
  }

  const data = await response.json();
  const text = data.content[0].text;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Could not parse product data');
}

// Generate product image
async function generateProductImage(description, apiKey) {
  const prompt = `Professional product photography of: ${description}. Shot on white background, studio lighting, high-end commercial photography style. The product should look premium and desirable.`;

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to generate product image');
  }

  const data = await response.json();
  return data.data[0].url;
}

// Regenerate just the product
async function regenerateProduct() {
  await showFlagshipProduct();
}

// Start over
function startOver() {
  document.getElementById('business-input').value = '';
  currentBrand = { name: '', tagline: '', description: '' };
  showSection('input-section');
  document.getElementById('flagship-section').classList.add('hidden');
}

// Close modal on escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// Close modal on background click
document.getElementById('api-modal').addEventListener('click', (e) => {
  if (e.target.id === 'api-modal') closeModal();
});
