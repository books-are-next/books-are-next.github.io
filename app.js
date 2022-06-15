const allRepos = [];
let filteredRepos = [];
const index = {};
let showCovers = false;
const bookList = document.getElementById("book-list");
const alpha = document.getElementById("alpha");
const total = document.getElementById("total");
const search = document.getElementById("search");
const refresh = document.getElementById("refresh");
const covers = document.getElementById("covers");

function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}

document.addEventListener("DOMContentLoaded", () => {
  loadData(1);

  alpha.addEventListener("click", (event) => {
    const target = event.target;
    const char = target.dataset.char;

    [...alpha.querySelectorAll("li")].forEach((el) => {
      el.classList.remove("selected");
    });
    target.classList.add("selected");

    renderRepos(allRepos.filter((repo) => repo.name.substring(0, 1) === char));
  });

  search.addEventListener(
    "input",
    debounce((event) => {
      if (!event.target.value || event.target.value.length < 2) return;
      const regex = new RegExp(event.target.value);

      renderRepos(allRepos.filter((repo) => regex.test(repo.name)));
    })
  );

  refresh.addEventListener("click", clearCache);

  covers.addEventListener("input", (event) => {
    showCovers = event.target.checked;
    rerenderRepos();
  });
});

function renderRepos(repos) {
  console.log(repos);
  filteredRepos = [...repos];
  rerenderRepos();
}

async function rerenderRepos() {
  const rendered = await Promise.all(filteredRepos.map(renderRepo));
  bookList.innerHTML = rendered.join("");
}

function rerenderIndex() {
  total.innerHTML = `(${allRepos.length} books)`;

  alpha.innerHTML = Object.keys(index)
    .sort()
    .map((i) => `<li data-char="${i}">${i}${index[i].length}</li>`)
    .join("");
}

async function renderRepo(repo) {
  var book = null;
  var converter = null;
  const pagesLink = `https://books-are-next.github.io/${repo.name}/`;

  try {
    if (repo.has_pages) {
      await fetch(pagesLink + "manifest.json")
        .then((resp) => {
          if (resp.status === 200) return resp.json();
          else return null;
        })
        .then((manifest) => {
          if (manifest) book = manifest;
        });

      await fetch(pagesLink + "epub2nb-output/")
        .then((resp) => {
          if (resp.status === 200) return true;
          else return false;
        })
        .then((converterWorks) => {
          if (converterWorks) converter = pagesLink + "epub2nb-output/";
        });
    }

    const repoLink = `<a href="${repo.html_url}">repo</a>`;
    const actionsLink = `<a href="${repo.html_url}/actions">actions</a>`;
    const coverImg =
      repo.has_pages && book
        ? `<img class="cover-image" src="${
            pagesLink + "assets/cover-1200x1200.png"
          }">`
        : null;
    const bookLink =
      repo.has_pages && book ? `<a href="${pagesLink}">book</a>` : null;
    const converterLink =
      repo.has_pages && converter
        ? `<a href="${converter}"">converter</a>`
        : null;
    const settingsLink = !repo.has_pages
      ? `pages not set up in <a href="${repo.html_url}/settings/pages">settings</a>`
      : null;
    const badge = `<img src="https://github.com/books-are-next/${repo.name}/actions/workflows/publish.yml/badge.svg">`;
    const links = [repoLink, actionsLink, bookLink, converterLink, settingsLink]
      .filter((l) => l !== null)
      .join(" | ");

    return `
<div class="repo ${book ? "book" : ""}">
  ${showCovers ? coverImg : ""}
  ${book ? badge : ""}
  <h2>${book ? `${book.author}: ${book.title}` : repo.name}</h2>
  ${book ? `<p>books-are-next/${repo.name}</p>` : ""}
  <p>${links}</p>
</div>`;
  } catch {
    return "";
  }
}

function addLoaded(repos) {
  allRepos.push(...repos);

  cacheRepos(repos);

  repos.forEach((repo) => {
    const initial = repo.name.substring(0, 1);
    if (!index[initial]) index[initial] = [];
    index[initial].push(repo);
  });

  rerenderIndex();
}

function clearCache() {
  localStorage.removeItem("all-repos");

  allRepos.splice(0, allRepos.length);

  for (var key in index) {
    if (index.hasOwnProperty(key)) {
      delete index[key];
    }
  }

  loadData(1);
}

function getCached() {
  const cached = localStorage.getItem("all-repos");

  return cached ? JSON.parse(cached) : null;
}

function cacheRepos(repos) {
  const cached = getCached();

  const all = cached ? cached : [];
  all.push(...repos);
  localStorage.setItem("all-repos", JSON.stringify(all));
}

function loadData(page) {
  if (page === 1) {
    refresh.classList.add("rotating");
    const cached = getCached();
    if (cached) {
      allRepos.push(...cached);
      cached.forEach((repo) => {
        const initial = repo.name.substring(0, 1);
        if (!index[initial]) index[initial] = [];
        index[initial].push(repo);
      });

      rerenderIndex();
      return;
    }
  }

  fetch(
    `https://api.github.com/orgs/books-are-next/repos?page=${page}&per_page=100`,
    { cache: "no-store" }
  )
    .then((response) => response.json())
    .then(async (data) => {
      const info = await Promise.all(
        data.filter(
          (repo) =>
            repo.name !== "library" && repo.name !== "books-are-next.github.io"
        )
      );

      if (info.length > 0) addLoaded(info);

      /*if (info.length > 0)
        document.getElementById("content").innerHTML =
          document.getElementById("content").innerHTML + info.join("");*/
      if (info.length > 95) loadData(page + 1);
      else refresh.classList.remove("rotating");
    });
}
