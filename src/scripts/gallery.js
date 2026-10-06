// Client-side search + "Show more" for the wallpaper grid.
// The full grid is server-rendered, so the site works (and is crawlable) without this script.

const grid = document.querySelector('[data-grid]');
const input = document.querySelector('[data-search-input]');

if (grid) {
  const cards = [...grid.querySelectorAll('[data-card]')];
  const more = document.querySelector('[data-more]');
  const moreButton = document.querySelector('[data-more-button]');
  const empty = document.querySelector('[data-empty]');
  const count = document.querySelector('[data-count]');
  const heading = document.querySelector('[data-grid-heading]');
  const hideOnSearch = document.querySelectorAll('[data-hide-on-search]');
  const pageSize = Number(grid.dataset.pageSize) || 24;

  let limit = pageSize;
  let query = '';

  const normalise = (s) =>
    s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim();

  function render() {
    const terms = normalise(query).split(/\s+/).filter(Boolean);
    let matches = 0;

    for (const card of cards) {
      const isMatch = terms.every((t) => card.dataset.search.includes(t));
      if (isMatch) matches += 1;
      card.removeAttribute('data-late');
      card.hidden = !(isMatch && matches <= limit);
    }

    const searching = terms.length > 0;
    count.textContent = `${matches} ${matches === 1 ? 'wallpaper' : 'wallpapers'}`;
    heading.textContent = searching ? `Results for “${query.trim()}”` : heading.dataset.default;
    empty.hidden = matches > 0;
    more.hidden = matches <= limit;
    hideOnSearch.forEach((el) => (el.hidden = searching));
  }

  function setQuery(value) {
    query = value;
    limit = pageSize;
    render();
    const url = new URL(location.href);
    if (value.trim()) url.searchParams.set('q', value.trim());
    else url.searchParams.delete('q');
    history.replaceState(null, '', url);
  }

  if (input) {
    input.addEventListener('input', () => setQuery(input.value));
    // Pressing the keyboard's Search key dismisses the iOS keyboard.
    input.closest('form')?.addEventListener('submit', () => input.blur());
    // Support links like /?q=forest (the tag links on wallpaper pages use this).
    const initial = new URLSearchParams(location.search).get('q');
    if (initial) {
      input.value = initial;
      query = initial;
    }
  }

  moreButton?.addEventListener('click', () => {
    limit += pageSize;
    render();
  });

  render();
}
