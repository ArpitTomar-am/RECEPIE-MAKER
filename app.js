document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const recipeGrid = document.getElementById('recipe-grid');
  const statusMessage = document.getElementById('status-message');
  const themeToggle = document.getElementById('theme-toggle');
  const favCountSpan = document.getElementById('fav-count');
  const viewFavoritesBtn = document.getElementById('view-favorites-btn');
  const categoryChips = document.querySelectorAll('.chip');

  const modal = document.getElementById('recipe-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const modalDetails = document.getElementById('modal-details');

  // State Management
  let favorites = JSON.parse(localStorage.getItem('recipeFavorites')) || [];
  let currentFilter = 'all';
  let showingFavorites = false;

  // Initialize Theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    themeToggle.textContent = '☀️ Light Mode';
  }

  updateFavCount();

  // Dark Mode Toggle
  themeToggle.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.body.removeAttribute('data-theme');
      themeToggle.textContent = '🌙 Dark Mode';
      localStorage.setItem('theme', 'light');
    } else {
      document.body.setAttribute('data-theme', 'dark');
      themeToggle.textContent = '☀️ Light Mode';
      localStorage.setItem('theme', 'dark');
    }
  });

  // Skeleton Loader Rendering
  function showSkeleton() {
    statusMessage.textContent = '';
    recipeGrid.innerHTML = Array(6).fill('<div class="skeleton-card"></div>').join('');
  }

  // Search API Call
  async function searchRecipes(queryOverride = null) {
    showingFavorites = false;
    viewFavoritesBtn.classList.remove('active');
    
    const query = queryOverride || searchInput.value.trim();
    if (!query) {
      statusMessage.textContent = "Please enter an ingredient or recipe name.";
      recipeGrid.innerHTML = "";
      return;
    }

    showSkeleton();

    try {
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!data.meals) {
        recipeGrid.innerHTML = "";
        statusMessage.textContent = `No recipes found for "${query}". Try "chicken", "pasta", or "cake".`;
        return;
      }

      statusMessage.textContent = "";
      displayRecipes(data.meals);
    } catch (error) {
      recipeGrid.innerHTML = "";
      statusMessage.textContent = "Error connecting to the API server.";
      console.error(error);
    }
  }

  // Display Cards
  function displayRecipes(meals) {
    recipeGrid.innerHTML = "";
    
    // Filter by Category Chip if active
    let filteredMeals = meals;
    if (currentFilter !== 'all') {
      filteredMeals = meals.filter(m => m.strCategory.toLowerCase() === currentFilter.toLowerCase());
    }

    if (filteredMeals.length === 0) {
      statusMessage.textContent = "No recipes match the selected category filter.";
      return;
    }

    filteredMeals.forEach(meal => {
      const isFav = favorites.some(f => f.idMeal === meal.idMeal);
      const card = document.createElement('div');
      card.classList.add('card');

      card.innerHTML = `
        <div class="card-img-wrapper">
          <img src="${meal.strMealThumb}" alt="${meal.strMeal}" loading="lazy">
          <button class="fav-badge" data-id="${meal.idMeal}">${isFav ? '❤️' : '🤍'}</button>
        </div>
        <div class="card-content">
          <h3 class="card-title">${meal.strMeal}</h3>
          <div class="card-meta">
            <p><strong>Category:</strong> ${meal.strCategory}</p>
            <p><strong>Area:</strong> ${meal.strArea}</p>
          </div>
        </div>
      `;

      // Card click opens Modal
      card.querySelector('.card-content').addEventListener('click', () => openRecipeModal(meal));
      card.querySelector('.card-img-wrapper img').addEventListener('click', () => openRecipeModal(meal));

      // Heart Button click toggles favorite
      card.querySelector('.fav-badge').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(meal);
      });

      recipeGrid.appendChild(card);
    });
  }

  // Favorite Toggle Logic
  function toggleFavorite(meal) {
    const index = favorites.findIndex(f => f.idMeal === meal.idMeal);
    if (index > -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push(meal);
    }
    localStorage.setItem('recipeFavorites', JSON.stringify(favorites));
    updateFavCount();

    if (showingFavorites) {
      renderFavorites();
    } else {
      // Re-render search results to update heart icon state
      const currentCards = Array.from(recipeGrid.children);
      if (currentCards.length > 0) {
        searchRecipes(searchInput.value.trim());
      }
    }
  }

  function updateFavCount() {
    favCountSpan.textContent = favorites.length;
  }

  function renderFavorites() {
    showingFavorites = true;
    recipeGrid.innerHTML = "";
    if (favorites.length === 0) {
      statusMessage.textContent = "You haven't saved any favorite recipes yet! Click ❤️ on cards to bookmark them.";
      return;
    }
    statusMessage.textContent = "Your Saved Favorites ❤️";
    displayRecipes(favorites);
  }

  // Modal Details Populator
  function openRecipeModal(meal) {
    let ingredientsList = '';
    
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (ingredient && ingredient.trim() !== "") {
        ingredientsList += `<li>${measure ? measure : ''} ${ingredient}</li>`;
      }
    }

    modalDetails.innerHTML = `
      <img class="modal-img" src="${meal.strMealThumb}" alt="${meal.strMeal}">
      <h2>${meal.strMeal}</h2>
      <p style="margin-top:4px; color: var(--text-secondary);"><strong>Category:</strong> ${meal.strCategory} | <strong>Area:</strong> ${meal.strArea}</p>
      
      <h3 style="margin-top:15px;">🛒 Ingredients:</h3>
      <ul class="ingredients-list">${ingredientsList}</ul>
      
      <h3>👨‍🍳 Instructions:</h3>
      <p class="instructions-text">${meal.strInstructions}</p>
      
      <div class="modal-actions">
        ${meal.strYoutube ? `<a class="yt-link" href="${meal.strYoutube}" target="_blank">▶ Watch YouTube Video</a>` : ''}
        <button class="print-btn" onclick="window.print()">🖨️ Print Recipe</button>
      </div>
    `;

    modal.classList.add('active');
  }

  // Category Filter Chips Listener
  categoryChips.forEach(chip => {
    chip.addEventListener('click', () => {
      categoryChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.category;
      
      if (currentFilter !== 'all' && currentFilter !== 'Chicken') {
        searchInput.value = currentFilter;
      }
      searchRecipes();
    });
  });

  // Navigation & Listeners
  viewFavoritesBtn.addEventListener('click', renderFavorites);
  searchBtn.addEventListener('click', () => searchRecipes());
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchRecipes();
  });

  closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  // Initial Startup
  searchRecipes('chicken');
});