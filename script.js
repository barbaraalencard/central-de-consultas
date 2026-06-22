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

busca.addEventListener("input", pesquisar);

function pesquisar() {

    const termo = normalizar(
        busca.value.trim()
    );

    if (termo.length === 0) {

        mostrarResultados(dados);

        return;

    }

    const palavrasPesquisa = termo.split(/\s+/);

    if (
    abaAtual === "contatos" ||
    abaAtual === "convenios"
) {

    const encontrados = dados.filter(item =>

        normalizar(
            item.join(" ")
        ).includes(termo)

    );

    mostrarResultados(encontrados);

    return;

}

    const encontrados = dados
        .map(item => {

            let score = 0;

            const codigo =
                normalizar(item[0]);

            const nome =
                normalizar(item[1]);

            const categoria =
                normalizar(item[2]);

            const perfil =
                normalizar(item[3]);

            const palavrasChave =
                normalizar(item[4] || "");

            const palavrasNome = nome
                .replace(/[^\w\s]/g, " ")
                .split(/\s+/);

            const palavrasChaveArray = palavrasChave
                .replace(/[^\w\s,]/g, " ")
                .replaceAll(",", " ")
                .split(/\s+/);

            // EXIGE correspondência exata
          let corresponde;

if (
    abaAtual === "contatos" ||
    abaAtual === "convenios"
) {

    const textoCompleto = normalizar(
        item.join(" ")
    );

    corresponde =
        palavrasPesquisa.every(
            palavra =>
                textoCompleto.includes(palavra)
        );

} else {

    corresponde =
        palavrasPesquisa.every(palavra =>

            palavrasNome.includes(palavra) ||

            palavrasChaveArray.includes(palavra) ||

            codigo === palavra

        );

}

            if (!corresponde) {

                return {
                    item,
                    score: 0
                };

            }

            palavrasPesquisa.forEach(palavra => {

                if (
                    palavrasNome.includes(
                        palavra
                    )
                ) {

                    score += 100;

                }

                if (
                    palavrasChaveArray.includes(
                        palavra
                    )
                ) {

                    score += 20;

                }

                if (
                    codigo === palavra
                ) {

                    score += 500;

                }

            });

            // Prioridades

            if (
                nome.includes("citacao") &&
                nome.includes("reu preso")
            ) {

                score += 300;

            }

            else if (
                nome.includes("citacao") &&
                nome.includes("reu solto")
            ) {

                score += 150;

            }

            else if (
                nome.includes("mandado")
            ) {

                score += 50;

            }

            return {
                item,
                score
            };

        })

        .filter(r => r.score > 0)

        .sort(
            (a, b) =>
                b.score - a.score
        )

        .map(r => r.item);

    mostrarResultados(
        encontrados
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