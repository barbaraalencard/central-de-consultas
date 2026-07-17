let dados = [];
let abaAtual = "analise";
let palavrasPesquisaAtual = [];
let timeoutToast = null;
let carregamentoAtual = 0;

const busca = document.getElementById("busca");
const resultados = document.getElementById("resultados");
const filtroCategoria = document.getElementById("filtroCategoria");
const grupoFiltro = document.querySelector(".grupo-filtro");
const limparBusca = document.getElementById("limparBusca");
const contadorResultados = document.getElementById("contadorResultados");
const modoCompacto = document.getElementById("modoCompacto");
const toast = document.getElementById("toast");

const arquivos = {
    analise: "modelos-analise.csv",
    possentenca: "modelos-pos-sentenca.csv",
    contatos: "contatos.csv",
    convenios: "convenios.csv"
};

const colunasConvenios = {
    nome: 0,
    nomeAntigo: 1,
    cnpj: 2,
    codigo: 3,
    categoria: 4
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

function alternarFavorito(codigo) {

    let favoritos = obterFavoritos();
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

    salvarFavoritos(favoritos);
    pesquisar();

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

    const resposta = await fetch(arquivo);

    if (!resposta.ok) {

        throw new Error(`Nao foi possivel carregar ${arquivo}`);

    }

    const buffer = await resposta.arrayBuffer();
    const texto = new TextDecoder("windows-1252").decode(buffer);
    const registros = lerCsv(texto);

    registros.shift();

    return registros;

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

function obterBadgeSistema(sistema) {

    const sistemaNormalizado = normalizar(sistema).toUpperCase();

    if (
        sistemaNormalizado.includes("SAJ") &&
        sistemaNormalizado.includes("PJE")
    ) {

        return `<span class="badge badge-ambos">SAJ e PJe</span>`;

    }

    if (sistemaNormalizado.includes("PJE")) {

        return `<span class="badge badge-pje">PJe</span>`;

    }

    return `<span class="badge badge-saj">SAJ</span>`;

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

    lista.forEach(item => {

        if (
            abaAtual === "analise" ||
            abaAtual === "possentenca" ||
            abaAtual === "favoritos"
        ) {

            const favoritos = obterFavoritos();
            const ehFavorito = favoritos.includes(item[0]);
            const classeFavorito = ehFavorito ? " card-favorito" : "";
            const textoFavorito = ehFavorito ? "★ Favorito" : "☆ Favoritar";

            resultados.innerHTML += `
                <div class="card${classeFavorito}">
                    <h2>${destacarTexto(item[1])}</h2>

                    ${obterBadgeSistema(item[5] || "")}

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
                            data-favorito="${escaparAtributo(item[0])}">
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
            `;

        } else if (abaAtual === "contatos") {

            const nomeAntigo = item[2] || "";

            resultados.innerHTML += `
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

                        <button
                            type="button"
                            class="botao-email"
                            data-email="${escaparAtributo(item[1])}">
                            Abrir e-mail
                        </button>
                    </div>
                </div>
            `;

        } else if (abaAtual === "convenios") {

            resultados.innerHTML += `
                <div class="card">
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
            `;

        }

    });

}

function obterMensagemVazia() {

    if (abaAtual === "favoritos") {

        return "Nenhum modelo favorito ainda.";

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

    return 2;

}

function atualizarFiltroCategorias() {

    if (
        abaAtual !== "analise" &&
        abaAtual !== "possentenca" &&
        abaAtual !== "convenios"
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

    palavrasPesquisaAtual = obterPalavrasPesquisa(termo);

    let lista = dados;

    if (
        categoriaSelecionada &&
        (abaAtual === "analise" ||
         abaAtual === "possentenca" ||
         abaAtual === "convenios")
    ) {

        const indiceCategoria = obterIndiceCategoria();

        lista = lista.filter(item =>
            normalizar(item[indiceCategoria]) ===
            normalizar(categoriaSelecionada)
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

function abrirEmail(emails) {

    const destinatarios = emails
        .split(";")
        .map(email => email.trim())
        .filter(Boolean)
        .join(",");

    if (!destinatarios) {

        mostrarToast("E-mail não encontrado");
        return;

    }

    window.location.href = `mailto:${destinatarios}`;

}

async function carregarFavoritos() {

    const carregamento = ++carregamentoAtual;

    abaAtual = "favoritos";
    resultados.innerHTML = "";
    atualizarContador(0, true);

    const favoritos = obterFavoritos();
    const arquivosModelos = [
        "modelos-analise.csv",
        "modelos-pos-sentenca.csv"
    ];

    try {

        const todosModelos = [];

        for (const arquivo of arquivosModelos) {

            const modelos = await carregarCsv(arquivo);
            todosModelos.push(...modelos);

        }

        dados = todosModelos.filter(item =>
            favoritos.includes(item[0])
        );

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
limparBusca.addEventListener("click", limparPesquisa);
modoCompacto.addEventListener("click", alternarModoCompacto);

resultados.addEventListener("click", evento => {

    const botaoCopiar = evento.target.closest("[data-copiar]");

    if (botaoCopiar) {

        copiar(botaoCopiar.dataset.copiar);
        return;

    }

    const botaoEmail = evento.target.closest("[data-email]");

    if (botaoEmail) {

        abrirEmail(botaoEmail.dataset.email);
        return;

    }

    const botaoFavorito = evento.target.closest("[data-favorito]");

    if (botaoFavorito) {

        alternarFavorito(
            botaoFavorito.dataset.favorito
        );

    }

});
