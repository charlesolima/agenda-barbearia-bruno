const SUPABASE_URL = "https://vqqljbnqnuitnivndckx.supabase.co";
const SUPABASE_KEY = "sb_publishable_IlfuEiyBv_AeFB8M4qGZyQ_woYAKpim";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

/* ==========================
   1. Elementos da página
========================== */

const cliente = document.querySelector("#cliente");
const telefone = document.querySelector("#telefone");
const servico = document.querySelector("#servico");
const data = document.querySelector("#data");
const horarios = document.querySelector("#horarios");
const btnAgendar = document.querySelector("#btnAgendar");
const listaAgendamentos = document.querySelector("#listaAgendamentos");
const mensagem = document.querySelector("#mensagem");

const CHAVE_STORAGE = "agendamentos";

let horariosOcupadosSupabase = [];
async function carregarHorariosOcupados() {
    if (!data.value) {
        horariosOcupadosSupabase = [];
        atualizarHorarios();
        return;
    }

    const { data: horarios, error } = await supabaseClient.rpc(
        "horarios_ocupados",
        {
            p_data: data.value
        }
    );

    if (error) {
        console.error("Erro ao consultar horários:", error);

        mostrarMensagem(
            "Não foi possível consultar os horários. Tente novamente.",
            "erro"
        );

        return;
    }

    horariosOcupadosSupabase = horarios.map(item => ({
        data: data.value,
        horario: item.horario
    }));

    atualizarHorarios();
}
let horarioSelecionado = "";
let agendamentos = [];


/* ==========================
   2. Mensagens e utilitários
========================== */

function mostrarMensagem(texto, tipo) {
    mensagem.textContent = texto;
    mensagem.className = `mensagem ${tipo}`;
    mensagem.hidden = false;
}

function limparMensagem() {
    mensagem.textContent = "";
    mensagem.className = "mensagem";
    mensagem.hidden = true;
}

function atualizarDestaqueData() {
    const campoData = data.closest(".campo");

    if (campoData) {
        campoData.classList.toggle(
            "data-selecionada",
            Boolean(data.value)
        );
    }
}

function obterDataAtual() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function obterHoraAtual() {
    const agora = new Date();

    return (
        `${String(agora.getHours()).padStart(2, "0")}:` +
        `${String(agora.getMinutes()).padStart(2, "0")}`
    );
}

function formatarData(dataISO) {
    return dataISO.split("-").reverse().join("/");
}

function statusDoAgendamento(item) {
    // Compatibilidade com os agendamentos antigos.
    return item.status || "agendado";
}

data.min = obterDataAtual();


/* ==========================
   3. Formatar telefone
========================== */

telefone.addEventListener("input", function () {
    const numeros = telefone.value
        .replace(/\D/g, "")
        .slice(0, 11);

    if (numeros.length === 0) {
        telefone.value = "";
    } else if (numeros.length <= 2) {
        telefone.value = `(${numeros}`;
    } else {
        telefone.value =
            `(${numeros.slice(0, 2)}) ` +
            numeros.slice(2, 7) +
            (numeros.length > 7
                ? `-${numeros.slice(7)}`
                : "");
    }
});


/* ==========================
   4. Gerar horários
========================== */

function gerarHorarios() {
    const periodos = [
        { inicio: 8 * 60, fim: 11 * 60 + 30 },
        { inicio: 14 * 60, fim: 20 * 60 }
    ];

    horarios.replaceChildren();

    periodos.forEach(function (periodo) {
        for (
            let minutos = periodo.inicio;
            minutos <= periodo.fim;
            minutos += 30
        ) {
            const hora = String(
                Math.floor(minutos / 60)
            ).padStart(2, "0");

            const minuto = String(
                minutos % 60
            ).padStart(2, "0");

            const horario = `${hora}:${minuto}`;

            const botao = document.createElement("button");

            botao.type = "button";
            botao.textContent = horario;
            botao.dataset.horario = horario;
            botao.classList.add("horario-disponivel");

            horarios.appendChild(botao);
        }
    });
}


/* ==========================
   5. Selecionar horários
========================== */

function limparSelecaoHorario() {
    horarioSelecionado = "";

    horarios.querySelectorAll("button").forEach(
        function (botao) {
            botao.classList.remove(
                "selecionado",
                "horario-selecionado"
            );
        }
    );
}

horarios.addEventListener("click", function (evento) {
    const botao = evento.target.closest("button");

    if (
        !botao ||
        !horarios.contains(botao) ||
        botao.disabled
    ) {
        return;
    }

    limparSelecaoHorario();

    horarioSelecionado = botao.dataset.horario;

    botao.classList.add("horario-selecionado");

    limparMensagem();
});


/* ==========================
   6. Atualizar disponibilidade
========================== */

function atualizarHorarios() {
    const hoje = obterDataAtual();
    const horaAtual = obterHoraAtual();

    horarios.querySelectorAll("button").forEach(
        function (botao) {
            const horario = botao.dataset.horario;

           const ocupado = horariosOcupadosSupabase.some(
    function (item) {
        return item.data === data.value &&
               item.horario === horario;
    }
);

            const passou =
                data.value === hoje &&
                horario <= horaAtual;

            const semData = !data.value;

            botao.disabled = semData || ocupado || passou;

            botao.classList.toggle(
                "horario-disponivel",
                !semData && !ocupado && !passou
            );

            botao.classList.toggle(
                "horario-ocupado",
                ocupado
            );

            botao.classList.toggle(
                "horario-passado",
                passou
            );

            botao.classList.toggle(
                "horario-selecionado",
                horarioSelecionado === horario &&
                !botao.disabled
            );
        }
    );

    if (horarioSelecionado) {
        const selecionado = Array.from(
            horarios.querySelectorAll("button")
        ).find(
            botao =>
                botao.dataset.horario === horarioSelecionado
        );

        if (!selecionado || selecionado.disabled) {
            limparSelecaoHorario();
        }
    }
}

data.addEventListener("change", function () {
    limparMensagem();
    limparSelecaoHorario();

    const hoje = obterDataAtual();

    if (data.value && data.value < hoje) {
        mostrarMensagem(
            "Não é possível selecionar uma data passada.",
            "erro"
        );

        data.value = "";
    }

    data.min = hoje;

   atualizarDestaqueData();
    carregarHorariosOcupados();
});


/* ==========================
   7. Salvar e carregar dados
========================== */

function salvarAgendamentos() {
    try {
        localStorage.setItem(
            CHAVE_STORAGE,
            JSON.stringify(agendamentos)
        );

        return true;
    } catch (erro) {
        console.error(
            "Erro ao salvar agendamentos:",
            erro
        );

        mostrarMensagem(
            "Não foi possível salvar os dados neste navegador.",
            "erro"
        );

        return false;
    }
}

async function carregarAgendamentos() {
    try {
        const dadosSalvos = localStorage.getItem(
            CHAVE_STORAGE
        );

        const dados = dadosSalvos
            ? JSON.parse(dadosSalvos)
            : [];

        if (!Array.isArray(dados)) {
            throw new Error("Formato de dados inválido.");
        }

        agendamentos = dados
            .filter(item =>
                item &&
                typeof item.cliente === "string" &&
                typeof item.telefone === "string" &&
                typeof item.servico === "string" &&
                typeof item.data === "string" &&
                typeof item.horario === "string"
            )
            .map(item => ({
                ...item,
                status: [
                    "agendado",
                    "concluido",
                    "cancelado"
                ].includes(item.status)
                    ? item.status
                    : "agendado"
            }));

    } catch (erro) {
        console.error(
            "Erro ao carregar agendamentos:",
            erro
        );

        agendamentos = [];

        mostrarMensagem(
            "Não foi possível ler os agendamentos salvos.",
            "erro"
        );
    }
}


/* ==========================
   8. Exibir os três grupos
========================== */

function mostrarAgendamentos() {
    listaAgendamentos.replaceChildren();

    const proximos = agendamentos
        .map((item, indiceOriginal) => ({
            ...item,
            indiceOriginal
        }))
        .filter(
            item => statusDoAgendamento(item) === "agendado"
        )
        .sort((a, b) =>
            `${a.data}T${a.horario}`.localeCompare(
                `${b.data}T${b.horario}`
            )
        );

    const concluidos = agendamentos
        .map((item, indiceOriginal) => ({
            ...item,
            indiceOriginal
        }))
        .filter(
            item => statusDoAgendamento(item) === "concluido"
        )
        .sort((a, b) =>
            `${b.data}T${b.horario}`.localeCompare(
                `${a.data}T${a.horario}`
            )
        );

    const cancelados = agendamentos
        .map((item, indiceOriginal) => ({
            ...item,
            indiceOriginal
        }))
        .filter(
            item => statusDoAgendamento(item) === "cancelado"
        )
        .sort((a, b) =>
            `${b.data}T${b.horario}`.localeCompare(
                `${a.data}T${a.horario}`
            )
        );

    function criarSecao(
        titulo,
        itens,
        tipo,
        textoVazio
    ) {
        const secao = document.createElement("section");
        secao.className = `grupo-agendamentos ${tipo}`;

        const cabecalho = document.createElement("div");
        cabecalho.className = "cabecalho-grupo";

        const tituloSecao = document.createElement("h3");
        tituloSecao.textContent = titulo;

        const contador = document.createElement("span");
        contador.className = "contador-agendamentos";
        contador.textContent = itens.length;

        cabecalho.append(tituloSecao, contador);
        secao.appendChild(cabecalho);

        if (itens.length === 0) {
            const vazio = document.createElement("p");

            vazio.className = "lista-vazia";
            vazio.textContent = textoVazio;

            secao.appendChild(vazio);

            return secao;
        }

        itens.forEach(function (agendamento) {
            const card = document.createElement("article");
            card.className = "agendamento";
            card.classList.add(`agendamento-${tipo}`);

            const dataReserva = document.createElement("div");
            dataReserva.className = "data-agendamento";

            const textoData = document.createElement("span");
            textoData.textContent = formatarData(
                agendamento.data
            );

            dataReserva.appendChild(textoData);

            const nome = document.createElement("h3");
            nome.textContent = agendamento.cliente;

            const telefoneCliente = document.createElement("p");
            telefoneCliente.textContent =
                `Telefone: ${agendamento.telefone}`;

            const servicoCliente = document.createElement("p");
            servicoCliente.textContent =
                `Serviço: ${agendamento.servico}`;

            const horarioCliente = document.createElement("p");
            horarioCliente.className = "horario-agendamento";
            horarioCliente.textContent =
                `Horário: ${agendamento.horario}`;

            card.append(
                dataReserva,
                nome,
                telefoneCliente,
                servicoCliente,
                horarioCliente
            );

            const status = statusDoAgendamento(agendamento);

            if (
                status === "concluido" ||
                status === "cancelado"
            ) {
                const etiqueta = document.createElement("p");

                etiqueta.className =
                    `etiqueta-status status-${status}`;

                etiqueta.textContent =
                    status === "concluido"
                        ? "Serviço concluído"
                        : "Agendamento cancelado";

                card.appendChild(etiqueta);
            }

            if (status === "agendado") {
                const acoes = document.createElement("div");
                acoes.className = "acoes-agendamento";

                const botaoConcluir =
                    document.createElement("button");

                botaoConcluir.type = "button";
                botaoConcluir.className = "btn-concluir";
                botaoConcluir.textContent = "Concluir serviço";

                botaoConcluir.addEventListener("click", () => {
                    concluirAgendamento(
                        agendamento.indiceOriginal
                    );
                });

                const botaoCancelar =
                    document.createElement("button");

                botaoCancelar.type = "button";
                botaoCancelar.className = "btn-cancelar";
                botaoCancelar.textContent =
                    "Cancelar agendamento";

                botaoCancelar.addEventListener("click", () => {
                    cancelarAgendamento(
                        agendamento.indiceOriginal
                    );
                });

                acoes.append(
                    botaoConcluir,
                    botaoCancelar
                );

                card.appendChild(acoes);
            }

            secao.appendChild(card);
        });

        return secao;
    }

    listaAgendamentos.append(
        criarSecao(
            "Próximos agendamentos",
            proximos,
            "proximos",
            "Você não tem agendamentos pendentes."
        ),
        criarSecao(
            "Serviços concluídos",
            concluidos,
            "concluidos",
            "Nenhum serviço foi concluído ainda."
        ),
        criarSecao(
            "Agendamentos cancelados",
            cancelados,
            "cancelados",
            "Nenhum agendamento foi cancelado."
        )
    );
}


/* ==========================
   9. Validar agendamento
========================== */

function validarAgendamento() {
    if (
        !cliente.value.trim() ||
        !telefone.value.trim() ||
        !servico.value ||
        !data.value ||
        !horarioSelecionado
    ) {
        mostrarMensagem(
            "Preencha todos os campos e selecione um horário.",
            "erro"
        );

        return false;
    }

    const hoje = obterDataAtual();

    if (data.value < hoje) {
        mostrarMensagem(
            "Não é possível agendar em uma data passada.",
            "erro"
        );

        data.min = hoje;
        data.focus();

        return false;
    }

    if (
        data.value === hoje &&
        horarioSelecionado <= obterHoraAtual()
    ) {
        mostrarMensagem(
            "Esse horário já passou. Escolha outro horário disponível.",
            "erro"
        );

        atualizarHorarios();
        limparSelecaoHorario();

        return false;
    }

    if (telefone.value.replace(/\D/g, "").length !== 11) {
        mostrarMensagem(
            "Informe um celular com DDD e 9 dígitos.",
            "erro"
        );

        telefone.focus();

        return false;
    }

    const horarioOcupado = agendamentos.some(item =>
        item.data === data.value &&
        item.horario === horarioSelecionado &&
        statusDoAgendamento(item) !== "cancelado"
    );

    if (horarioOcupado) {
        mostrarMensagem(
            "Este horário já está ocupado. Selecione outro.",
            "erro"
        );

        atualizarHorarios();
        limparSelecaoHorario();

        return false;
    }

    return true;
}


/* ==========================
   10. Criar agendamento
========================== */

async function criarAgendamento() {
    limparMensagem();

    if (!validarAgendamento()) return;

    const novoAgendamento = {
        cliente: cliente.value.trim(),
        telefone: telefone.value,
        servico: servico.value,
        data: data.value,
        horario: horarioSelecionado,
        status: "agendado"
    };

    const { error } = await supabaseClient.rpc(
    "criar_agendamento",
    {
        p_cliente: novoAgendamento.cliente,
        p_telefone: novoAgendamento.telefone,
        p_servico: novoAgendamento.servico,
        p_data: novoAgendamento.data,
        p_horario: novoAgendamento.horario
    }
);

if (error) {
    console.error("Erro ao salvar no Supabase:", error);

    mostrarMensagem(
        error.message.includes("já está reservado")
            ? "Este horário já está reservado. Escolha outro."
            : "Não foi possível realizar o agendamento. Tente novamente.",
        "erro"
    );

    await carregarAgendamentos();
    atualizarHorarios();
    return;
}

await carregarAgendamentos();

    mostrarAgendamentos();

    cliente.value = "";
    telefone.value = "";
    servico.value = "";
    data.value = "";

    limparSelecaoHorario();
    atualizarDestaqueData();
    atualizarHorarios();

    mostrarMensagem(
        "Agendamento realizado com sucesso!",
        "sucesso"
    );
}


/* ==========================
   11. Concluir serviço
========================== */

function concluirAgendamento(indice) {
    const item = agendamentos[indice];

    if (
        !item ||
        statusDoAgendamento(item) !== "agendado"
    ) {
        return;
    }

    const confirmar = window.confirm(
        `Confirmar que o serviço de ${item.cliente} foi concluído?`
    );

    if (!confirmar) return;

    item.status = "concluido";

    if (!salvarAgendamentos()) {
        item.status = "agendado";
        return;
    }

    mostrarAgendamentos();
    atualizarHorarios();

    mostrarMensagem(
        "Serviço marcado como concluído.",
        "sucesso"
    );
}


/* ==========================
   12. Cancelar agendamento
========================== */

function cancelarAgendamento(indice) {
    const item = agendamentos[indice];

    if (
        !item ||
        statusDoAgendamento(item) !== "agendado"
    ) {
        return;
    }

    const confirmar = window.confirm(
        "Deseja realmente cancelar este agendamento?"
    );

    if (!confirmar) return;

    item.status = "cancelado";

    if (!salvarAgendamentos()) {
        item.status = "agendado";
        return;
    }

    mostrarAgendamentos();
    atualizarHorarios();

    mostrarMensagem(
        "Agendamento cancelado e horário liberado.",
        "sucesso"
    );
}


/* ==========================
   13. Inicializar a agenda
========================== */

btnAgendar.addEventListener(
    "click",
    criarAgendamento
);

gerarHorarios();
carregarAgendamentos();
mostrarAgendamentos();
atualizarDestaqueData();
carregarHorariosOcupados();
