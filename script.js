let abaAtual = "modelos";

let modelos = [];
let contatos = [];
let convenios = [];

const busca = document.getElementById("busca");
const resultados = document.getElementById("resultados");

carregarTudo();

busca.addEventListener("input", pesquisar);

async function carregarTudo(){

    modelos = await carregarCSV("modelos.csv");
    contatos = await carregarCSV("contatos.csv");
    convenios = await carregarCSV("convenios.csv");

    console.log("Modelos:", modelos.length);
    console.log("Contatos:", contatos.length);
    console.log("Convênios:", convenios.length);

}

async function carregarCSV(arquivo){

    try{

        const resposta = await fetch(arquivo);

        const buffer = await resposta.arrayBuffer();

        const texto = new TextDecoder("windows-1252").decode(buffer);

        const linhas = texto.split(/\r?\n/);

        const cabecalho = linhas.shift().split(";");

        const dados = [];

        linhas.forEach(linha=>{

            if(!linha.trim()) return;

            const colunas = linha.split(";");

            const objeto = {};

            cabecalho.forEach((campo,index)=>{

                objeto[campo.trim()] =
                colunas[index]?.trim() || "";

            });

            dados.push(objeto);

        });

        return dados;

    }

    catch(erro){

        console.error(arquivo, erro);

        return [];

    }

}

function trocarAba(nome){

    abaAtual = nome;

    document
    .querySelectorAll(".aba")
    .forEach(btn=>btn.classList.remove("ativa"));

    event.target.classList.add("ativa");

    resultados.innerHTML = "";
    busca.value = "";

}

function pesquisar(){

    const texto = busca.value.toLowerCase();

    resultados.innerHTML = "";

    if(texto.length < 2) return;

    if(abaAtual === "modelos") pesquisarModelos(texto);

    if(abaAtual === "contatos") pesquisarContatos(texto);

    if(abaAtual === "convenios") pesquisarConvenios(texto);

}

function pesquisarModelos(texto){

    modelos.forEach(modelo=>{

        const dados = JSON.stringify(modelo)
        .toLowerCase();

        if(dados.includes(texto)){

            resultados.innerHTML += `
            <div class="card">

                <h2>${modelo["Nome do Modelo"]}</h2>

                <p class="codigo">
                    Código: ${modelo["Codigo"]}
                </p>

                <p>
                    Categoria: ${modelo["Categoria"]}
                </p>

                <p>
                    Perfil: ${modelo["Perfil"]}
                </p>

                <button
                class="copiar"
                onclick="copiar('${modelo["Codigo"]}')">
                    Copiar Código
                </button>

            </div>
            `;

        }

    });

}

function pesquisarContatos(texto){

    contatos.forEach(contato=>{

        const dados = JSON.stringify(contato)
        .toLowerCase();

        if(dados.includes(texto)){

            resultados.innerHTML += `
            <div class="card">

                <h2>
                    ${contato["Delegacia"]}
                </h2>

                <p>
                    📧 ${contato["E-mail"]}
                </p>

            </div>
            `;

        }

    });

}

function pesquisarConvenios(texto){

    convenios.forEach(convenio=>{

        const dados = JSON.stringify(convenio)
        .toLowerCase();

        if(dados.includes(texto)){

            resultados.innerHTML += `
            <div class="card">

                <h2>
                    ${convenio["Convênio"]}
                </h2>

                <p>
                    CNPJ: ${convenio["CNPJ"]}
                </p>

                <p>
                    Código: ${convenio["Código"]}
                </p>

                <p>
                    Categoria: ${convenio["Categoria"]}
                </p>

            </div>
            `;

        }

    });

}

function copiar(codigo){

    navigator.clipboard.writeText(codigo);

    alert("Código copiado: " + codigo);

}