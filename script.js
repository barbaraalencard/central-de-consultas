let dados = [];
let abaAtual = "analise";
let palavrasPesquisaAtual = [];
let timeoutToast = null;
let carregamentoAtual = 0;

const busca = document.getElementById("busca");
const resultados = document.getElementById("resultados");
const filtroCategoria = document.getElementById("filtroCategoria");
const grupoFiltro = document.querySelector(".grupo-filtro");
const grupoFiltroSistema = document.getElementById("grupoFiltroSistema");
const filtrosSistema = document.querySelectorAll('input[name="filtroSistema"]');
const grupoFiltroFavoritos = document.getElementById("grupoFiltroFavoritos");
const filtrosFavoritos = document.querySelectorAll('input[name="filtroFavoritos"]');
const limparBusca = document.getElementById("limparBusca");
const contadorResultados = document.getElementById("contadorResultados");
const modoCompacto = document.getElementById("modoCompacto");
const toast = document.getElementById("toast");
const voltarTopo = document.getElementById("voltarTopo");

const cacheCsv = {};
const novosModelos = new Set();
const duracaoSeloNovo = 14 * 24 * 60 * 60 * 1000;
const modelosNovosCentral = {
    "4919": "2026-08-27T09:04:16-03:00",
    "6047": "2026-08-27T09:04:16-03:00",
    "6049": "2026-08-27T09:04:16-03:00",
    "6051": "2026-08-27T09:04:16-03:00",
    "6053": "2026-08-27T09:04:16-03:00",
    "6055": "2026-08-27T09:04:16-03:00",
    "6057": "2026-08-27T09:04:16-03:00",
    "6059": "2026-08-27T09:04:16-03:00",
    "6061": "2026-08-27T09:04:16-03:00",
    "6063": "2026-08-27T09:04:16-03:00",
    "6071": "2026-08-27T09:04:16-03:00"
};

const arquivos = {
    analise: "modelos-analise.csv",
    possentenca: "modelos-pos-sentenca.csv",
    contatos: "contatos.csv",
    convenios: "convenios.csv",
    links: "links.csv"
};

const colunasConvenios = {
    nome: 0,
    nomeAntigo: 1,
    cnpj: 2,
    codigo: 3,
    categoria: 4
};

const colunasLinks = {
    nome: 0,
    url: 1,
    categoria: 2,
    palavrasChave: 3
};

inicializarPreferencias();
carregarDados("analise");

function normalizar(texto) {

    return (texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

}

function escaparHtml(valor) {

    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}

function escaparAtributo(valor) {

    return escaparHtml(valor);

}

function criarMapaNormalizado(texto) {

    let normalizado = "";
    const mapa = [];

    Array.from(String(texto || "")).forEach((caractere, indice) => {

        const partes = normalizar(caractere);

        Array.from(partes).forEach(parte => {

            normalizado += parte;
            mapa.push(indice);

        });

    });

    return {
        normalizado,
        mapa
    };

}

function destacarTexto(texto) {

    const valor = String(texto || "");

    if (palavrasPesquisaAtual.length === 0 || valor === "") {

        return escaparHtml(valor);

    }

    const { normalizado, mapa } = criarMapaNormalizado(valor);
    const faixas = [];

    palavrasPesquisaAtual.forEach(palavra => {

        let inicio = normalizado.indexOf(palavra);

        while (inicio !== -1) {

            const fim = inicio + palavra.length - 1;

            faixas.push({
                inicio: mapa[inicio],
                fim: mapa[fim] + 1
            });

            inicio = normalizado.indexOf(palavra, inicio + palavra.length);

        }

    });

    if (faixas.length === 0) {

        return escaparHtml(valor);

    }

    faixas.sort((a, b) => a.inicio - b.inicio);

    const unidas = [];

    faixas.forEach(faixa => {

        const ultima = unidas[unidas.length - 1];

        if (!ultima || faixa.inicio > ultima.fim) {

            unidas.push({ ...faixa });

        } else {

            ultima.fim = Math.max(ultima.fim, faixa.fim);

        }

    });

    let html = "";
    let cursor = 0;

    unidas.forEach(faixa => {

        html += escaparHtml(valor.slice(cursor, faixa.inicio));
        html += `<mark>${escaparHtml(valor.slice(faixa.inicio, faixa.fim))}</mark>`;
        cursor = faixa.fim;

    });

    html += escaparHtml(valor.slice(cursor));

    return html;

}

function obterFavoritos() {

    try {

        return JSON.parse(
            localStorage.getItem("favoritos")
        ) || [];

    } catch (erro) {

        return [];

    }

}

function salvarFavoritos(favoritos) {

    localStorage.setItem(
        "favoritos",
        JSON.stringify(favoritos)
    );

}

function obterFavoritosConvenios() {

    try {

        return JSON.parse(
            localStorage.getItem("favoritosConvenios")
        ) || [];

    } catch (erro) {

        return [];

    }

}

function salvarFavoritosConvenios(favoritos) {

    localStorage.setItem(
        "favoritosConvenios",
        JSON.stringify(favoritos)
    );

}

function obterFavoritosLinks() {

    try {

        return JSON.parse(
            localStorage.getItem("favoritosLinks")
        ) || [];

    } catch (erro) {

        return [];

    }

}

function salvarFavoritosLinks(favoritos) {

    localStorage.setItem(
        "favoritosLinks",
        JSON.stringify(favoritos)
    );

}

function agendarExpiracaoSeloNovo(codigo, dataInclusao, chaveDatas) {

    const tempoRestante =
        duracaoSeloNovo - (Date.now() - Number(dataInclusao));

    if (tempoRestante <= 0) return;

    window.setTimeout(() => {

        novosModelos.delete(codigo);

        if (chaveDatas) try {

            const datasNovos =
                JSON.parse(localStorage.getItem(chaveDatas)) || {};

            delete datasNovos[codigo];
            localStorage.setItem(chaveDatas, JSON.stringify(datasNovos));

        } catch (erro) {

            localStorage.setItem(chaveDatas, JSON.stringify({}));

        }

        if (
            abaAtual === "analise" ||
            abaAtual === "possentenca" ||
            abaAtual === "favoritos"
        ) {

            pesquisar();

        }

    }, tempoRestante + 100);

}

function alternarFavorito(codigo, tipo = "modelo") {

    const ehConvenio = tipo === "convenio";
    const ehLink = tipo === "link";
    let favoritos = ehConvenio
        ? obterFavoritosConvenios()
        : ehLink
            ? obterFavoritosLinks()
            : obterFavoritos();
    const jaExiste = favoritos.includes(codigo);

    if (jaExiste) {

        favoritos = favoritos.filter(
            favorito => favorito !== codigo
        );

        mostrarToast("Removido dos favoritos");

    } else {

        favoritos.push(codigo);
        mostrarToast("Adicionado aos favoritos");

    }

    if (ehConvenio) {

        salvarFavoritosConvenios(favoritos);

    } else if (ehLink) {

        salvarFavoritosLinks(favoritos);

    } else {

        salvarFavoritos(favoritos);

    }

    if (abaAtual === "favoritos") {

        carregarFavoritos();
        return;

    }

    pesquisar();

}

function registrarNovosModelos(arquivo, registros) {

    if (!arquivo.startsWith("modelos-")) return;

    const chaveConhecidos = `modelosConhecidos:${arquivo}`;
    const chaveDatas = `modelosNovosDatas:${arquivo}`;
    const codigosAtuais = registros.map(item => item[0]).filter(Boolean);
    const codigosAtuaisSet = new Set(codigosAtuais);

    Object.entries(modelosNovosCentral).forEach(([codigo, dataInclusao]) => {

        const data = new Date(dataInclusao).getTime();

        if (
            codigosAtuaisSet.has(codigo) &&
            Date.now() - data <= duracaoSeloNovo
        ) {

            novosModelos.add(codigo);
            agendarExpiracaoSeloNovo(codigo, data, null);

        }

    });

    let conhecidos = [];
    let datasNovos = {};

    try {

        conhecidos = JSON.parse(localStorage.getItem(chaveConhecidos)) || [];
        datasNovos = JSON.parse(localStorage.getItem(chaveDatas)) || {};

    } catch (erro) {

        conhecidos = [];
        datasNovos = {};

    }

    if (conhecidos.length === 0) {

        localStorage.setItem(chaveConhecidos, JSON.stringify(codigosAtuais));
        localStorage.setItem(chaveDatas, JSON.stringify({}));
        return;

    }

    const agora = Date.now();
    const conhecidosSet = new Set(conhecidos);

    codigosAtuais.forEach(codigo => {

        if (!conhecidosSet.has(codigo)) {

            datasNovos[codigo] = agora;
            conhecidosSet.add(codigo);

        }

    });

    Object.entries(datasNovos).forEach(([codigo, data]) => {

        if (agora - Number(data) <= duracaoSeloNovo) {

            novosModelos.add(codigo);
            agendarExpiracaoSeloNovo(codigo, data, chaveDatas);

        } else {

            novosModelos.delete(codigo);
            delete datasNovos[codigo];

        }

    });

    localStorage.setItem(chaveConhecidos, JSON.stringify([...conhecidosSet]));
    localStorage.setItem(chaveDatas, JSON.stringify(datasNovos));

}

function lerCsv(texto) {

    const registros = [];
    let campo = "";
    let linha = [];
    let dentroDeAspas = false;

    for (let indice = 0; indice < texto.length; indice++) {

        const caractere = texto[indice];
        const proximo = texto[indice + 1];

        if (caractere === "\"") {

            if (dentroDeAspas && proximo === "\"") {

                campo += "\"";
                indice++;

            } else {

                dentroDeAspas = !dentroDeAspas;

            }

            continue;

        }

        if (caractere === ";" && !dentroDeAspas) {

            linha.push(campo.trim());
            campo = "";
            continue;

        }

        if ((caractere === "\n" || caractere === "\r") && !dentroDeAspas) {

            if (caractere === "\r" && proximo === "\n") {

                indice++;

            }

            linha.push(campo.trim());

            if (linha.some(valor => valor !== "")) {

                registros.push(linha);

            }

            linha = [];
            campo = "";
            continue;

        }

        campo += caractere;

    }

    linha.push(campo.trim());

    if (linha.some(valor => valor !== "")) {

        registros.push(linha);

    }

    return registros;

}

async function carregarCsv(arquivo) {

    if (cacheCsv[arquivo]) {

        return cacheCsv[arquivo].map(item => [...item]);

    }

    const resposta = await fetch(arquivo);

    if (!resposta.ok) {

        throw new Error(`Nao foi possivel carregar ${arquivo}`);

    }

    const buffer = await resposta.arrayBuffer();
    let texto;

    try {

        texto = new TextDecoder("utf-8", { fatal: true }).decode(buffer);

    } catch (erro) {

        texto = new TextDecoder("windows-1252").decode(buffer);

    }
    const registros = lerCsv(texto);

    registros.shift();
    registrarNovosModelos(arquivo, registros);
    cacheCsv[arquivo] = registros;

    return registros.map(item => [...item]);

}

async function carregarDados(tipo) {

    const carregamento = ++carregamentoAtual;

    abaAtual = tipo;
    dados = [];
    resultados.innerHTML = "";
    atualizarContador(0, true);

    try {

        dados = await carregarCsv(arquivos[tipo]);

        if (carregamento !== carregamentoAtual) {

            return;

        }

        atualizarFiltroCategorias();
        pesquisar();

    } catch (erro) {

        if (carregamento !== carregamentoAtual) {

            return;

        }

        console.error("Erro:", erro);
        atualizarContador(0);
        resultados.innerHTML = `
            <div class="card card-vazio">
                <h2>Não foi possível carregar os dados.</h2>
            </div>
        `;

    }

}

function mostrarResultados(lista) {

    resultados.innerHTML = "";
    atualizarContador(lista.length);

    if (lista.length === 0) {

        resultados.innerHTML = `
            <div class="card card-vazio">
                <h2>${obterMensagemVazia()}</h2>
            </div>
        `;

        return;

    }

    const htmlCards = [];
    const favoritos = obterFavoritos();
    const favoritosConvenios = obterFavoritosConvenios();
    const favoritosLinks = obterFavoritosLinks();

    lista.forEach(item => {

        const tipoItem = item.tipoFavorito ||
            (abaAtual === "convenios"
                ? "convenio"
                : abaAtual === "links"
                    ? "link"
                    : "modelo");

        if (
            abaAtual === "analise" ||
            abaAtual === "possentenca" ||
            (abaAtual === "favoritos" && tipoItem === "modelo")
        ) {

            const ehFavorito = favoritos.includes(item[0]);
            const classeFavorito = ehFavorito ? " card-favorito" : "";
            const textoFavorito = ehFavorito ? "★ Favorito" : "☆ Favoritar";

            htmlCards.push(`
                <div class="card${classeFavorito}">
                    <div class="titulo-card">
                        <h2>${destacarTexto(item[1])}</h2>
                        ${novosModelos.has(item[0]) ? `<span class="selo-novo"><span aria-hidden="true">★</span> Novo modelo</span>` : ""}
                    </div>

                    <p class="codigo">
                        Código: ${destacarTexto(item[0])}
                    </p>

                    <p>
                        Categoria: ${destacarTexto(item[2])}
                    </p>

                    <p>
                        Perfil: ${destacarTexto(item[3])}
                    </p>

                    <div class="acoes-modelo">
                        <button
                            type="button"
                            class="favorito${ehFavorito ? " ativo" : ""}"
                            data-favorito="${escaparAtributo(item[0])}"
                            data-tipo-favorito="modelo">
                            ${textoFavorito}
                        </button>

                        <button
                            type="button"
                            class="copiar"
                            data-copiar="${escaparAtributo(item[0])}">
                            Copiar Código
                        </button>
                    </div>
                </div>
            `);

        } else if (abaAtual === "contatos") {

            const nomeAntigo = item[2] || "";

            htmlCards.push(`
                <div class="card">
                    <h2>${destacarTexto(item[0])}</h2>

                    ${
                        nomeAntigo
                            ? `<p><strong>Nome antigo:</strong> ${destacarTexto(nomeAntigo)}</p>`
                            : ""
                    }

                    <p>
                        <strong>E-mail:</strong> ${destacarTexto(item[1])}
                    </p>

                    <div class="acoes-modelo">
                        <button
                            type="button"
                            class="copiar"
                            data-copiar="${escaparAtributo(item[1])}">
                            Copiar E-mail
                        </button>

                    </div>
                </div>
            `);

        } else if (
            abaAtual === "convenios" ||
            (abaAtual === "favoritos" && tipoItem === "convenio")
        ) {

            const codigoConvenio = item[colunasConvenios.codigo];
            const ehFavorito = favoritosConvenios.includes(codigoConvenio);
            const classeFavorito = ehFavorito ? " card-favorito" : "";
            const textoFavorito = ehFavorito ? "★ Favorito" : "☆ Favoritar";

            htmlCards.push(`
                <div class="card${classeFavorito}">
                    <h2>${destacarTexto(item[colunasConvenios.nome])}</h2>

                    ${
                        item[colunasConvenios.nomeAntigo]
                            ? `<p><strong>Nome antigo:</strong> ${destacarTexto(item[colunasConvenios.nomeAntigo])}</p>`
                            : ""
                    }

                    <p>
                        CNPJ: ${destacarTexto(item[colunasConvenios.cnpj])}
                    </p>

                    <p>
                        Código: ${destacarTexto(item[colunasConvenios.codigo])}
                    </p>

                    <p>
                        Categoria: ${destacarTexto(item[colunasConvenios.categoria])}
                    </p>

                    <div class="botoes-convenio">
                        <button
                            type="button"
                            class="favorito${ehFavorito ? " ativo" : ""}"
                            data-favorito="${escaparAtributo(codigoConvenio)}"
                            data-tipo-favorito="convenio">
                            ${textoFavorito}
                        </button>

                        <button
                            type="button"
                            class="copiar"
                            data-copiar="${escaparAtributo(item[colunasConvenios.nome])}">
                            Copiar Nome
                        </button>

                        <button
                            type="button"
                            class="copiar"
                            data-copiar="${escaparAtributo(item[colunasConvenios.codigo])}">
                            Copiar Código
                        </button>

                        <button
                            type="button"
                            class="copiar"
                            data-copiar="${escaparAtributo(item[colunasConvenios.cnpj])}">
                            Copiar CNPJ
                        </button>
                    </div>
                </div>
            `);

        } else if (
            abaAtual === "links" ||
            (abaAtual === "favoritos" && tipoItem === "link")
        ) {

            const url = item[colunasLinks.url];
            const urlSegura = /^https?:\/\//i.test(url) ? url : "";
            const ehFavorito = favoritosLinks.includes(url);
            const classeFavorito = ehFavorito ? " card-favorito" : "";
            const textoFavorito = ehFavorito ? "★ Favorito" : "☆ Favoritar";
            let enderecoExibido = url;

            try {

                enderecoExibido = new URL(url).host;

            } catch (erro) {

                enderecoExibido = "Endereço indisponível";

            }

            htmlCards.push(`
                <div class="card card-link${classeFavorito}">
                    <h2>${destacarTexto(item[colunasLinks.nome])}</h2>

                    <p>
                        Categoria: ${destacarTexto(item[colunasLinks.categoria])}
                    </p>

                    <p class="endereco-link">
                        ${destacarTexto(enderecoExibido)}
                    </p>

                    <div class="acoes-modelo">
                        <button
                            type="button"
                            class="favorito${ehFavorito ? " ativo" : ""}"
                            data-favorito="${escaparAtributo(url)}"
                            data-tipo-favorito="link">
                            ${textoFavorito}
                        </button>

                        ${urlSegura ? `
                            <a
                                class="abrir-link"
                                href="${escaparAtributo(urlSegura)}"
                                target="_blank"
                                rel="noopener noreferrer">
                                Abrir acesso &#8599;
                            </a>
                        ` : ""}
                    </div>
                </div>
            `);

        }

    });

    resultados.innerHTML = htmlCards.join("");

}

function obterMensagemVazia() {

    if (abaAtual === "favoritos") {

        const tipo = document.querySelector(
            'input[name="filtroFavoritos"]:checked'
        )?.value;

        if (tipo === "modelo") return "Nenhum modelo favorito ainda.";
        if (tipo === "convenio") return "Nenhum convênio favorito ainda.";
        if (tipo === "link") return "Nenhum link favorito ainda.";
        return "Nenhum favorito ainda.";

    }

    return "Nenhum resultado encontrado.";

}

function atualizarContador(total, carregando = false) {

    if (carregando) {

        contadorResultados.textContent = "Carregando...";
        return;

    }

    contadorResultados.textContent =
        total === 1
            ? "1 resultado encontrado"
            : `${total} resultados encontrados`;

}

function obterIndiceCategoria() {

    if (abaAtual === "convenios") {

        return colunasConvenios.categoria;

    }

    if (abaAtual === "links") {

        return colunasLinks.categoria;

    }

    return 2;

}

function atualizarFiltroCategorias() {

    const ehAbaModelos =
        abaAtual === "analise" || abaAtual === "possentenca";

    grupoFiltroSistema.hidden = !ehAbaModelos;
    grupoFiltroFavoritos.hidden = abaAtual !== "favoritos";

    if (
        abaAtual !== "analise" &&
        abaAtual !== "possentenca" &&
        abaAtual !== "convenios" &&
        abaAtual !== "links"
    ) {

        grupoFiltro.style.display = "none";
        return;

    }

    grupoFiltro.style.display = "flex";

    filtroCategoria.innerHTML =
        `<option value="">Todas as categorias</option>`;

    const indiceCategoria = obterIndiceCategoria();

    const categorias = [
        ...new Set(
            dados
                .map(item => (item[indiceCategoria] || "").trim().toUpperCase())
                .filter(Boolean)
        )
    ].sort();

    categorias.forEach(categoria => {

        filtroCategoria.innerHTML += `
            <option value="${escaparAtributo(categoria)}">
                ${escaparHtml(categoria)}
            </option>
        `;

    });

}

function obterPalavrasPesquisa(termo) {

    const ignorar = [
        "de",
        "da",
        "do",
        "das",
        "dos",
        "e",
        "em",
        "para",
        "por",
        "com",
        "a",
        "o",
        "as",
        "os"
    ];

    return normalizar(termo)
        .split(/\s+/)
        .filter(palavra => palavra.length > 1)
        .filter(palavra =>
            !ignorar.includes(palavra)
        );

}

function pesquisar() {

    const termo = busca.value.trim();
    const categoriaSelecionada = filtroCategoria.value;
    const filtroSistemaSelecionado = document.querySelector(
        'input[name="filtroSistema"]:checked'
    )?.value || "";
    const filtroFavoritosSelecionado = document.querySelector(
        'input[name="filtroFavoritos"]:checked'
    )?.value || "";

    palavrasPesquisaAtual = obterPalavrasPesquisa(termo);

    let lista = dados;

    if (
        categoriaSelecionada &&
        (abaAtual === "analise" ||
         abaAtual === "possentenca" ||
         abaAtual === "convenios" ||
         abaAtual === "links")
    ) {

        const indiceCategoria = obterIndiceCategoria();

        lista = lista.filter(item =>
            normalizar(item[indiceCategoria]) ===
            normalizar(categoriaSelecionada)
        );

    }

    if (
        filtroSistemaSelecionado &&
        (abaAtual === "analise" || abaAtual === "possentenca")
    ) {

        lista = lista.filter(item =>
            normalizar(item[5]).includes(
                normalizar(filtroSistemaSelecionado)
            )
        );

    }

    if (filtroFavoritosSelecionado && abaAtual === "favoritos") {

        lista = lista.filter(item =>
            item.tipoFavorito === filtroFavoritosSelecionado
        );

    }

    if (palavrasPesquisaAtual.length === 0) {

        mostrarResultados(lista);
        return;

    }

    const encontrados = lista.filter(item => {

        const texto = normalizar(
            item.join(" ")
        );

        return palavrasPesquisaAtual.every(palavra =>
            texto.includes(palavra)
        );

    });

    mostrarResultados(encontrados);

}

function limparPesquisa() {

    busca.value = "";
    filtroCategoria.value = "";
    document.getElementById("sistemaTodos").checked = true;
    document.getElementById("favoritosTodos").checked = true;
    palavrasPesquisaAtual = [];
    pesquisar();
    busca.focus();

}

function mostrarToast(mensagem) {

    toast.textContent = mensagem;
    toast.classList.add("visivel");

    window.clearTimeout(timeoutToast);

    timeoutToast = window.setTimeout(() => {

        toast.classList.remove("visivel");

    }, 1800);

}

async function copiar(texto) {

    try {

        await navigator.clipboard.writeText(texto);
        mostrarToast("Copiado!");

    } catch (erro) {

        const areaTemporaria = document.createElement("textarea");
        areaTemporaria.value = texto;
        areaTemporaria.setAttribute("readonly", "");
        areaTemporaria.style.position = "fixed";
        areaTemporaria.style.opacity = "0";

        document.body.appendChild(areaTemporaria);
        areaTemporaria.select();
        document.execCommand("copy");
        document.body.removeChild(areaTemporaria);

        mostrarToast("Copiado!");

    }

}

async function carregarFavoritos() {

    const carregamento = ++carregamentoAtual;

    abaAtual = "favoritos";
    resultados.innerHTML = "";
    atualizarContador(0, true);

    const favoritos = obterFavoritos();
    const favoritosConvenios = obterFavoritosConvenios();
    const favoritosLinks = obterFavoritosLinks();
    const arquivosModelos = [
        "modelos-analise.csv",
        "modelos-pos-sentenca.csv"
    ];

    try {

        const todosModelos = [];

        for (const arquivo of arquivosModelos) {

            const modelos = await carregarCsv(arquivo);
            modelos.forEach(item => item.tipoFavorito = "modelo");
            todosModelos.push(...modelos);

        }

        const modelosFavoritos = todosModelos.filter(item =>
            favoritos.includes(item[0])
        );

        const convenios = await carregarCsv(arquivos.convenios);
        convenios.forEach(item => item.tipoFavorito = "convenio");

        const conveniosFavoritos = convenios.filter(item =>
            favoritosConvenios.includes(item[colunasConvenios.codigo])
        );

        const links = await carregarCsv(arquivos.links);
        links.forEach(item => item.tipoFavorito = "link");

        const linksFavoritos = links.filter(item =>
            favoritosLinks.includes(item[colunasLinks.url])
        );

        dados = [
            ...modelosFavoritos,
            ...conveniosFavoritos,
            ...linksFavoritos
        ];

        if (carregamento !== carregamentoAtual) {

            return;

        }

        atualizarFiltroCategorias();
        pesquisar();

    } catch (erro) {

        if (carregamento !== carregamentoAtual) {

            return;

        }

        console.error("Erro:", erro);
        atualizarContador(0);
        resultados.innerHTML = `
            <div class="card card-vazio">
                <h2>Não foi possível carregar os favoritos.</h2>
            </div>
        `;

    }

}

function trocarAba(tipo, elemento) {

    document
        .querySelectorAll(".aba")
        .forEach(btn =>
            btn.classList.remove("ativa")
        );

    elemento.classList.add("ativa");

    busca.value = "";
    filtroCategoria.value = "";
    document.getElementById("sistemaTodos").checked = true;
    document.getElementById("favoritosTodos").checked = true;
    palavrasPesquisaAtual = [];

    if (tipo === "favoritos") {

        carregarFavoritos();
        return;

    }

    carregarDados(tipo);

}

function inicializarPreferencias() {

    const compactoAtivo =
        localStorage.getItem("modoCompacto") === "true";

    document.body.classList.toggle("compacto", compactoAtivo);
    modoCompacto.setAttribute("aria-pressed", String(compactoAtivo));

}

function alternarModoCompacto() {

    const ativo = !document.body.classList.contains("compacto");

    document.body.classList.toggle("compacto", ativo);
    modoCompacto.setAttribute("aria-pressed", String(ativo));
    localStorage.setItem("modoCompacto", String(ativo));
    mostrarToast(ativo ? "Modo compacto ativado" : "Modo compacto desativado");

}

busca.addEventListener("input", pesquisar);
filtroCategoria.addEventListener("change", pesquisar);
filtrosSistema.forEach(filtro =>
    filtro.addEventListener("change", pesquisar)
);
filtrosFavoritos.forEach(filtro =>
    filtro.addEventListener("change", pesquisar)
);
limparBusca.addEventListener("click", limparPesquisa);
modoCompacto.addEventListener("click", alternarModoCompacto);

window.addEventListener("scroll", () => {

    voltarTopo.classList.toggle("visivel", window.scrollY > 500);

}, { passive: true });

voltarTopo.addEventListener("click", () => {

    window.scrollTo({ top: 0, behavior: "smooth" });

});

resultados.addEventListener("click", evento => {

    const botaoCopiar = evento.target.closest("[data-copiar]");

    if (botaoCopiar) {

        copiar(botaoCopiar.dataset.copiar);
        return;

    }

    const botaoFavorito = evento.target.closest("[data-favorito]");

    if (botaoFavorito) {

        alternarFavorito(
            botaoFavorito.dataset.favorito,
            botaoFavorito.dataset.tipoFavorito
        );

    }

});
