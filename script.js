let dados = [];
let abaAtual = "analise";

const busca = document.getElementById("busca");
const resultados = document.getElementById("resultados");

const arquivos = {
    analise: "modelos-analise.csv",
    possentenca: "modelos-pos-sentenca.csv",
    contatos: "contatos.csv",
    convenios: "convenios.csv"
};

carregarDados("analise");

function normalizar(texto) {

    return (texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

}

function obterFavoritos() {

    return JSON.parse(
        localStorage.getItem("favoritos")
    ) || [];

}

function favoritar(codigo, botao) {

    let favoritos = obterFavoritos();

    if (favoritos.includes(codigo)) {

        favoritos = favoritos.filter(
            f => f !== codigo
        );

        botao.textContent = "☆ Favoritar";

    } else {

        favoritos.push(codigo);

        botao.textContent = "★ Favorito";

    }

    localStorage.setItem(
        "favoritos",
        JSON.stringify(favoritos)
    );

}

async function carregarDados(tipo) {

    abaAtual = tipo;

    dados = [];

    resultados.innerHTML = "";

    try {

        const resposta = await fetch(arquivos[tipo]);

        const buffer = await resposta.arrayBuffer();

        const texto = new TextDecoder("windows-1252").decode(buffer);

        const linhas = texto.split(/\r?\n/);

        linhas.shift();

        linhas.forEach(linha => {

            if (!linha.trim()) return;

            const colunas = linha.split(";");

            dados.push(colunas.map(c => c.trim()));
            

        });

        console.log("Registros carregados:", dados.length);

mostrarResultados(dados);

atualizarFiltroCategorias();

} catch (erro) {

    console.error("Erro:", erro);

}

}

function mostrarResultados(lista) {

    resultados.innerHTML = "";

    if (lista.length === 0) {

        resultados.innerHTML = `
            <div class="card">
                <h2>Nenhum resultado encontrado.</h2>
            </div>
        `;

        return;

    }

    lista.forEach(item => {

        // MODELOS
        if (
    abaAtual === "analise" ||
    abaAtual === "possentenca" ||
    abaAtual === "favoritos"
) {

            const sistema = item[5] || "";

            let badgeSistema = "";

            if (sistema.toUpperCase().includes("SAJ") &&
                sistema.toUpperCase().includes("PJE")) {

                badgeSistema =
                    `<span class="badge sistema-pje">
                        🟡 SAJ e PJe
                    </span>`;

            }

            else if (sistema.toUpperCase().includes("PJE")) {

                badgeSistema =
                    `<span class="badge sistema-pje">
                        🟢 PJe
                    </span>`;

            }

            else {

                badgeSistema =
                    `<span class="badge sistema-saj">
                        🔴 SAJ
                    </span>`;

            }

            const favoritos =
    obterFavoritos();

const ehFavorito =
    favoritos.includes(item[0]);

            resultados.innerHTML += `

            <div class="card">

                <h2>${item[1]}</h2>

                ${badgeSistema}

                <p class="codigo">
                    Código: ${item[0]}
                </p>

                <p>
                    Categoria: ${item[2]}
                </p>

                <p>
                    Perfil: ${item[3]}
                </p>

                <div class="acoes-modelo">
<button
    class="favorito"
    onclick="favoritar('${item[0]}', this)">

    ${ehFavorito ? "★ Favorito" : "☆ Favoritar"}

</button>

  
    <button
        class="copiar"
        onclick="copiar('${item[0]}')">

        Copiar Código

    </button>

</div>

            `;

        }

        // CONTATOS
        else if (abaAtual === "contatos") {

            const nomeAntigo = item[2] || "";

            resultados.innerHTML += `

            <div class="card">

                <h2>${item[0]}</h2>

                ${
                    nomeAntigo
                    ? `<p><strong>Nome antigo:</strong> ${nomeAntigo}</p>`
                    : ""
                }

                <p>
                    📧 ${item[1]}
                </p>

                <button
                    class="copiar"
                    onclick="copiar('${item[1]}')">

                    Copiar E-mail

                </button>

            </div>

            `;

        }

        // CONVÊNIOS
        else if (abaAtual === "convenios") {

            resultados.innerHTML += `

            <div class="card">

                <h2>${item[0]}</h2>

                <p>
                    CNPJ: ${item[1]}
                </p>

                <p>
                    Código: ${item[2]}
                </p>

                <p>
                    Categoria: ${item[3]}
                </p>

                <button
    class="copiar"
    onclick="copiar('${item[0]}')">

    Copiar Nome

</button>

<button
    class="copiar"
    onclick="copiar('${item[2]}')">

    Copiar Código

</button>

<button
    class="copiar"
    onclick="copiar('${item[1]}')">

    Copiar CNPJ

</button>

            </div>

            `;

        }

    });

}

function atualizarFiltroCategorias() {

    const filtro =
        document.getElementById("filtroCategoria");

    // Nas abas que não são modelos, esconde
    if (
        abaAtual !== "analise" &&
        abaAtual !== "possentenca"
    ) {

        filtro.style.display = "none";
        return;

    }

    filtro.style.display = "block";

    filtro.innerHTML =
        `<option value="">Todas as categorias</option>`;

    const categorias = [
    ...new Set(

        dados.map(item =>

            item[2]
                .trim()
                .toUpperCase()

        )

    )

].sort();

    categorias.forEach(categoria => {

        filtro.innerHTML += `
            <option value="${categoria}">
                ${categoria}
            </option>
        `;

    });

}

busca.addEventListener("input", pesquisar);

document
    .getElementById("filtroCategoria")
    .addEventListener(
        "change",
        pesquisar
    );

    function pesquisar() {

    const termo = normalizar(
        busca.value.trim()
    );

    const filtroCategoria =
        document.getElementById("filtroCategoria").value;

    let lista = dados;

    // Aplica o filtro de categoria mesmo sem texto pesquisado
    if (
        filtroCategoria &&
        (abaAtual === "analise" ||
         abaAtual === "possentenca")
    ) {

        lista = lista.filter(item =>
            normalizar(item[2]) ===
            normalizar(filtroCategoria)
        );

    }

    // Se não digitou nada, mostra apenas o resultado do filtro
    if (termo === "") {

        mostrarResultados(lista);
        return;

    }

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

const palavras = termo
    .split(/\s+/)
    .filter(palavra => palavra.length > 1)
    .filter(palavra =>
        !ignorar.includes(palavra)
    );

    const encontrados = lista.filter(item => {

        const texto = normalizar(
            item.join(" ")
        );

        return palavras.every(palavra =>
            texto.includes(palavra)
        );

    });

    mostrarResultados(encontrados);

}

function formatarCategoria(texto) {

    return texto
        .toLowerCase()
        .replace(/\b\w/g, letra =>
            letra.toUpperCase()
        );

}


function copiar(texto) {

    navigator.clipboard.writeText(texto);

    alert("Copiado: " + texto);

}

async function carregarFavoritos() {

    abaAtual = "favoritos";

    const favoritos =
        obterFavoritos();

    let todosModelos = [];

    const arquivosModelos = [
        "modelos-analise.csv",
        "modelos-pos-sentenca.csv"
    ];

    for (const arquivo of arquivosModelos) {

        const resposta =
            await fetch(arquivo);

        const buffer =
            await resposta.arrayBuffer();

        const texto =
            new TextDecoder(
                "windows-1252"
            ).decode(buffer);

        const linhas =
            texto.split(/\r?\n/);

        linhas.shift();

        linhas.forEach(linha => {

            if (!linha.trim())
                return;

            const colunas =
                linha.split(";");

            todosModelos.push(
                colunas.map(c =>
                    c.trim()
                )
            );

        });

    }

    abaAtual = "favoritos";

    mostrarResultados(

        todosModelos.filter(item =>

            favoritos.includes(
                item[0]
            )

        )

    );

}

function trocarAba(tipo, elemento) {

    document
        .querySelectorAll(".aba")
        .forEach(btn =>
            btn.classList.remove("ativa")
        );

    elemento.classList.add("ativa");

    busca.value = "";

    if (
        tipo === "favoritos"
    ) {

        carregarFavoritos();

        return;

    }

    carregarDados(tipo);

}