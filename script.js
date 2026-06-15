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
            abaAtual === "possentenca"
        ) {

            let seloSistema = "";

            const sistema = item[5]?.toUpperCase() || "";

            if (
                sistema.includes("PJE") &&
                !sistema.includes("SAJ")
            ) {

                seloSistema = `
                    <span class="badge-pje">
                        🟢 PJe
                    </span>
                `;

            }

            else if (
                sistema.includes("SAJ") &&
                !sistema.includes("PJE")
            ) {

                seloSistema = `
                    <span class="badge-saj">
                        🔴 SAJ
                    </span>
                `;

            }

            else {

                seloSistema = `
                    <span class="badge-ambos">
                        🟡 SAJ e PJe
                    </span>
                `;

            }

            resultados.innerHTML += `

            <div class="card">

                <h2>${item[1]}</h2>

                ${seloSistema}

                <p class="codigo">
                    Código: ${item[0]}
                </p>

                <p>
                    Categoria: ${item[2]}
                </p>

                <p>
                    Perfil: ${item[3]}
                </p>

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

            resultados.innerHTML += `

            <div class="card">

                <h2>${item[0]}</h2>

                ${item[2] ? `
                    <span class="badge-antigo">
                        Nome antigo: ${item[2]}
                    </span>
                ` : ""}

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

                <div class="botoes-convenio">

                    <button
                        class="copiar"
                        onclick="copiar('${item[1]}')">

                        Copiar CNPJ

                    </button>

                    <button
                        class="copiar"
                        onclick="copiar('${item[2]}')">

                        Copiar Código

                    </button>

                </div>

            </div>

            `;

        }

    });

}

busca.addEventListener("input", pesquisar);

function pesquisar() {

    const termo = busca.value.toLowerCase().trim();

    if (termo.length === 0) {

        mostrarResultados(dados);

        return;

    }

    const encontrados = dados.filter(item =>
        item.some(campo =>
            campo &&
            campo.toLowerCase().includes(termo)
        )
    );

    mostrarResultados(encontrados);

}

function copiar(texto) {

    navigator.clipboard.writeText(texto);

    alert("Copiado com sucesso!");

}

function trocarAba(tipo, elemento) {

    document
        .querySelectorAll(".aba")
        .forEach(btn =>
            btn.classList.remove("ativa"));

    elemento.classList.add("ativa");

    busca.value = "";

    carregarDados(tipo);

}