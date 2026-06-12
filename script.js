let modelos = [];

const busca = document.getElementById("busca");
const resultados = document.getElementById("resultados");

carregarCSV();

async function carregarCSV() {
    try {
        const resposta = await fetch("modelos.csv");

        const buffer = await resposta.arrayBuffer();
        const texto = new TextDecoder("windows-1252").decode(buffer);

        const linhas = texto.split(/\r?\n/);

        linhas.shift();

        linhas.forEach(linha => {
            if (!linha.trim()) return;

            const colunas = linha.split(";");

            if (colunas.length < 5) return;

            modelos.push({
                codigo: colunas[0].trim(),
                nome: colunas[1].trim(),
                categoria: colunas[2].trim(),
                perfil: colunas[3].trim(),
                palavras: colunas[4].trim()
            });
        });

        console.log("Modelos carregados:", modelos.length);

    } catch (erro) {
        console.error("Erro ao carregar CSV:", erro);
    }
}

busca.addEventListener("input", pesquisar);

function pesquisar() {

    const texto = busca.value.toLowerCase().trim();

    resultados.innerHTML = "";

    if (texto.length < 2) return;

    const termos = texto.split(" ");

    const encontrados = modelos
        .map(modelo => {

            let pontuacao = 0;

            termos.forEach(termo => {

                if (modelo.codigo.toLowerCase().includes(termo))
                    pontuacao += 10;

                if (modelo.nome.toLowerCase().includes(termo))
                    pontuacao += 5;

                if (modelo.categoria.toLowerCase().includes(termo))
                    pontuacao += 2;

                if (modelo.perfil.toLowerCase().includes(termo))
                    pontuacao += 1;

                if (modelo.palavras.toLowerCase().includes(termo))
                    pontuacao += 8;

            });

            return {
                ...modelo,
                pontuacao
            };

        })
        .filter(modelo => modelo.pontuacao > 0)
        .sort((a, b) => b.pontuacao - a.pontuacao);

    if (encontrados.length === 0) {
        resultados.innerHTML = `
            <div class="card">
                <h3>Nenhum resultado encontrado.</h3>
            </div>
        `;
        return;
    }

    encontrados.forEach(modelo => {

        resultados.innerHTML += `
            <div class="card">
                <h2>${modelo.nome}</h2>

                <p class="codigo">
                    Código: ${modelo.codigo}
                </p>

                <p>
                    Categoria: ${modelo.categoria}
                </p>

                <p>
                    Perfil: ${modelo.perfil}
                </p>

                <button onclick="copiar('${modelo.codigo}')">
                    Copiar Código
                </button>
            </div>
        `;

    });

}

function copiar(codigo) {
    navigator.clipboard.writeText(codigo);
    alert("Código copiado: " + codigo);
}