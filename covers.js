const allRepos = [];
let filteredRepos = [];
const index = {};
let showCovers = false;
const bookList = document.getElementById("book-list");
const total = document.getElementById("total");
const refresh = document.getElementById("refresh");

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

	refresh.addEventListener("click", clearCache);
});

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
		const coverLink =
			repo.has_pages && book
				? `<a href="${pagesLink + "assets/cover-398x566.png"}">`
				: "";
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

		if (!book) return "";

		return `<li>${coverLink}${
			book ? `${book.author}: ${book.title}` : repo.name
		}</a></li>`;
	} catch {
		return "";
	}
}

function renderRepos(repos) {
	filteredRepos = [...repos];
	rerenderRepos();
}

async function rerenderRepos() {
	const rendered = await Promise.all(filteredRepos.map(renderRepo));
	console.log(rendered);
	bookList.innerHTML = `<ul>${rendered.join("")}</ul>`;
}

function addLoaded(repos) {
	allRepos.push(...repos);

	cacheRepos(repos);

	repos.forEach((repo) => {
		const initial = repo.name.substring(0, 1);
		if (!index[initial]) index[initial] = [];
		index[initial].push(repo);
	});
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

			renderRepos(allRepos);
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
			else {
				refresh.classList.remove("rotating");
				renderRepos(allRepos);
			}
		});
}
