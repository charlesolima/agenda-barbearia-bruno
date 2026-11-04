const SUPABASE_URL = "https://vqqljbnqnuitnivndckx.supabase.co";
const SUPABASE_KEY = "sb_publishable_IlfuEiyBv_AeFB8M4qGZyQ_woYAKpim";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// WHATSAPP PARA SOLICITAÇÃO DE CANCELAMENTO
const WHATSAPP_BARBEARIA = "5511985105189";

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

function aplicarMascaraTelefone(campo) {
    campo.addEventListener("input", () => {
        let valor = campo.value.replace(/\D/g, "");

        valor = valor.substring(0, 11);

        if (valor.length > 7) {
            valor = valor.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
        } else if (valor.length > 2) {
            valor = valor.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
        } else if (valor.length > 0) {
            valor = "(" + valor;
        }

        campo.value = valor;
    });
}

// Aplicar a mesma formatação nos dois campos
aplicarMascaraTelefone(telefone);

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
        
const agora = new Date();

const hoje =
    `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;

const { data, error } = await supabaseClient
    .from("agendamentos")
    .select("id, cliente, telefone, servico, data, horario, status")
    .eq("status", "agendado")
    .gte("data", hoje)
    .order("data", { ascending: true })
    .order("horario", { ascending: true });

        if (error) {
            throw error;
        }

        agendamentos = (data || []).map(item => ({
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
            "Erro ao carregar agendamentos do Supabase:",
            erro
        );

        mostrarMensagem(
            "Não foi possível carregar os agendamentos.",
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

    function criarSecao(titulo, itens, tipo, textoVazio) {
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
            textoData.textContent = formatarData(agendamento.data);

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

                // Botão de solicitação de cancelamento pelo WhatsApp
                const botaoWhatsApp =
                    document.createElement("button");

                botaoWhatsApp.type = "button";
                botaoWhatsApp.className = "btn-whatsapp";
                botaoWhatsApp.textContent =
                    "Solicitar cancelamento pelo WhatsApp";

                botaoWhatsApp.addEventListener("click", () => {
                    const mensagemWhatsApp =
                        `Olá! Gostaria de solicitar o cancelamento do meu agendamento na Barbearia Bruno Almeida.\n\n` +
                        `Nome: ${agendamento.cliente}\n` +
                        `Data: ${formatarData(agendamento.data)}\n` +
                        `Horário: ${agendamento.horario}\n` +
                        `Serviço: ${agendamento.servico}\n\n` +
                        `Aguardo a confirmação. Obrigado!`;

                    const linkWhatsApp =
                        `https://wa.me/${WHATSAPP_BARBEARIA}?text=${encodeURIComponent(mensagemWhatsApp)}`;

                    window.open(linkWhatsApp, "_blank");
                });

                acoes.append(
                    botaoConcluir,
                    botaoCancelar
                );

                card.appendChild(acoes);
                card.appendChild(botaoWhatsApp);
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

await carregarHorariosOcupados();

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
atualizarDestaqueData();
carregarHorariosOcupados();

// LOGIN DO ADMINISTRADOR

const btnMostrarLogin = document.querySelector("#btnMostrarLogin");
const areaLogin = document.querySelector("#areaLogin");
const btnEntrarAdmin = document.querySelector("#btnEntrarAdmin");
const btnFecharLogin = document.querySelector("#btnFecharLogin");
const mensagemLogin = document.querySelector("#mensagemLogin");

btnMostrarLogin.addEventListener("click", () => {
    areaLogin.style.display = "block";
});

btnFecharLogin.addEventListener("click", () => {
    areaLogin.style.display = "none";
    mensagemLogin.textContent = "";
});

btnEntrarAdmin.addEventListener("click", async () => {
    const email = document.querySelector("#emailAdmin").value.trim();
    const senha = document.querySelector("#senhaAdmin").value;

    mensagemLogin.textContent = "Verificando acesso...";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password: senha
    });

    if (error) {
        console.error("Erro no login:", error);
        mensagemLogin.textContent = "E-mail ou senha incorretos.";
        return;
    }

    const { data: administrador, error: erroAdmin } =
        await supabaseClient.rpc("eh_administrador");

    if (erroAdmin || administrador !== true) {
        await supabaseClient.auth.signOut();
        mensagemLogin.textContent = "Acesso não autorizado.";
        return;
    }

    mensagemLogin.textContent = "Login realizado com sucesso!";

    areaLogin.style.display = "none";
    btnMostrarLogin.style.display = "block";
   document.querySelector("#painelAdmin").style.display = "block";

    await carregarAgendamentosAdmin();
    await carregarMensalistas();
});

// SAIR DO PAINEL ADMINISTRATIVO


const btnSairAdmin = document.querySelector("#btnSairAdmin");

btnSairAdmin.addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Erro ao sair:", error);
        alert("Não foi possível encerrar a sessão. Tente novamente.");
        return;
    }

    document.querySelector("#painelAdmin").style.display = "none";
    document.querySelector("#acessoAdmin").style.display = "block";
    btnMostrarLogin.style.display = "block";
    document.querySelector("#areaLogin").style.display = "none";
    document.querySelector("#emailAdmin").value = "";
    document.querySelector("#senhaAdmin").value = "";

    mensagemLogin.textContent = "";
});


// BUSCAR E EXIBIR AGENDAMENTOS NO PAINEL ADMINISTRATIVO

async function carregarAgendamentosAdmin() {
    const listaAdmin = document.querySelector("#listaAdmin");

    listaAdmin.textContent = "Carregando agendamentos...";

   
const agora = new Date();

const hoje =
    `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;

const { data, error } = await supabaseClient
    .from("agendamentos")
    .select("id, cliente, telefone, servico, data, horario, status")
    .eq("status", "agendado")
    .gte("data", hoje)
    .order("data", { ascending: true })
    .order("horario", { ascending: true });


    if (error) {
        console.error("Erro ao buscar agendamentos:", error);

        listaAdmin.textContent =
            "Não foi possível carregar os agendamentos.";

        return;
    }

   if (!data || data.length === 0) {
    listaAdmin.textContent = "Nenhum agendamento ativo encontrado.";
    return;
}

    listaAdmin.replaceChildren();

    data.forEach((agendamento) => {
        const card = document.createElement("div");
        card.classList.add("agendamento-admin");

        const cliente = document.createElement("p");
        cliente.textContent = `Cliente: ${agendamento.cliente}`;

        const telefone = document.createElement("p");
        telefone.textContent = `Telefone: ${agendamento.telefone}`;

        const servico = document.createElement("p");
        servico.textContent = `Serviço: ${agendamento.servico}`;

        const dataAgendamento = document.createElement("p");
        const partesData = agendamento.data.split("-");

        dataAgendamento.textContent =
            `Data: ${partesData[2]}/${partesData[1]}/${partesData[0]}`;

        const horario = document.createElement("p");
        horario.textContent = `Horário: ${agendamento.horario}`;

        const status = document.createElement("p");
        status.textContent = `Status: ${agendamento.status}`;

 
        // Adiciona os dados do agendamento ao cartão
        card.append(
            cliente,
            telefone,
            servico,
            dataAgendamento,
            horario,
            status
        );

      
        // Cria os botões somente para agendamentos ativos
        if (agendamento.status === "agendado") {

            // Botão para cancelar
            const botaoCancelar = document.createElement("button");

            botaoCancelar.type = "button";
            botaoCancelar.textContent = "Cancelar agendamento";
            botaoCancelar.classList.add("btn-cancelar-admin");

            botaoCancelar.addEventListener("click", async () => {
                const confirmar = confirm(
                    `Deseja cancelar o agendamento de ${agendamento.cliente} em ${partesData[2]}/${partesData[1]}/${partesData[0]} às ${agendamento.horario}?`
                );

                if (!confirmar) {
                    return;
                }

                botaoCancelar.disabled = true;
                botaoCancelar.textContent = "Cancelando...";

                const { error } = await supabaseClient
                    .from("agendamentos")
                    .update({ status: "cancelado" })
                    .eq("id", agendamento.id);

                if (error) {
                    console.error("Erro ao cancelar agendamento:", error);

                    alert(
                        "Não foi possível cancelar o agendamento. Verifique as permissões e tente novamente."
                    );

                    botaoCancelar.disabled = false;
                    botaoCancelar.textContent = "Cancelar agendamento";

                    return;
                }

                alert("Agendamento cancelado com sucesso!");

                await carregarAgendamentosAdmin();
            });

            card.appendChild(botaoCancelar);

            // Botão para marcar como concluído
            const botaoConcluir = document.createElement("button");

            botaoConcluir.type = "button";
            botaoConcluir.textContent = "Marcar como concluído";
            botaoConcluir.classList.add("btn-concluir-admin");

            botaoConcluir.addEventListener("click", async () => {

    const dataHoraAgendamento = new Date(
        `${agendamento.data}T${agendamento.horario}`
    );

    const agora = new Date();

    if (dataHoraAgendamento > agora) {
        alert(
            "Não é possível concluir um serviço antes da data e do horário agendados."
        );
        return;
    }

    const confirmar = confirm(
                    `Deseja marcar o agendamento de ${agendamento.cliente} do dia ${partesData[2]}/${partesData[1]}/${partesData[0]} às ${agendamento.horario} como concluído?`
                );

                if (!confirmar) {
                    return;
                }

                botaoConcluir.disabled = true;
                botaoConcluir.textContent = "Concluindo...";

                const { error } = await supabaseClient
                    .from("agendamentos")
                    .update({ status: "concluido" })
                    .eq("id", agendamento.id);

                if (error) {
                    console.error("Erro ao concluir agendamento:", error);

                    alert(
                        "Não foi possível concluir o agendamento. Verifique as permissões e tente novamente."
                    );

                    botaoConcluir.disabled = false;
                    botaoConcluir.textContent = "Marcar como concluído";

                    return;
                }

                alert("Agendamento marcado como concluído!");

                await carregarAgendamentosAdmin();
            });
                       card.appendChild(botaoConcluir);

            console.log(
                "Botão de concluir criado para:",
                agendamento.cliente
            );
        }

              listaAdmin.appendChild(card);

        console.log(
            "Agendamento exibido no painel:",
            agendamento.cliente,
            agendamento.data,
            agendamento.status
        );

    }); // Fecha data.forEach()

} // Fecha carregarAgendamentosAdmin()

const btnMostrarSenha = document.getElementById("btnMostrarSenha");
const campoSenha = document.getElementById("senhaAdmin");

btnMostrarSenha.addEventListener("click", function () {
    console.log("Botão clicado!");

    campoSenha.type =
        campoSenha.type === "password" ? "text" : "password";

    console.log("Tipo atual do campo:", campoSenha.type);
});
/* ==========================
   14. Configuração de Mensalistas
========================== */

const cadastroMensalista = document.querySelector("#cadastroMensalista");
const modalidadeMensalista = document.querySelector("#modalidadeMensalista");
const configuracaoMensalista = document.querySelector("#configuracaoMensalista");

const btnHorariosRecorrentes = document.querySelector("#btnHorariosRecorrentes");
const btnPacotesMensais = document.querySelector("#btnPacotesMensais");
const btnCancelarCadastroMensalista = document.querySelector("#btnCancelarCadastroMensalista");

function atualizarConfiguracaoMensalista() {
    configuracaoMensalista.replaceChildren();

    const modalidade = modalidadeMensalista.value;

    if (modalidade === "fixo_recorrente") {
        configuracaoMensalista.innerHTML = `
            <div class="campo">
                <label for="diaSemanaMensalista">Dia da semana</label>
                <select id="diaSemanaMensalista">
                    <option value="">Selecione o dia</option>
                    <option value="0">Domingo</option>
                    <option value="1">Segunda-feira</option>
                    <option value="2">Terça-feira</option>
                    <option value="3">Quarta-feira</option>
                    <option value="4">Quinta-feira</option>
                    <option value="5">Sexta-feira</option>
                    <option value="6">Sábado</option>
                </select>
            </div>

            <div class="campo">
                <label for="horarioMensalista">Horário fixo</label>
                <input type="time" id="horarioMensalista">
            </div>

            <div class="campo">
                <label for="inicioMensalista">Data de início</label>
                <input type="date" id="inicioMensalista">
            </div>

            <div class="campo">
                <label for="fimMensalista">Data de término (opcional)</label>
                <input type="date" id="fimMensalista">
            </div>
        `;
    }

    if (modalidade === "pacote_mensal") {
        configuracaoMensalista.innerHTML = `
            <div class="campo">
                <label for="tipoAgendamentoMensalista">Tipo de agendamento</label>
                <select id="tipoAgendamentoMensalista">
                    <option value="">Selecione o tipo</option>
                    <option value="livre">Agendamento livre</option>
                    <option value="definido">Agendamento definido</option>
                </select>
            </div>

            <div class="campo">
                <label for="creditosMensalista">Quantidade de atendimentos por mês</label>
                <input
                    type="number"
                    id="creditosMensalista"
                    min="1"
                    step="1"
                    placeholder="Ex.: 4"
                >
            </div>

            <div class="campo">
                <label for="regraCreditosMensalista">Créditos não utilizados</label>
                <select id="regraCreditosMensalista">
                    <option value="">Selecione a regra</option>
                    <option value="acumular">Acumular para o próximo mês</option>
                    <option value="expirar">Expirar no final do mês</option>
                </select>
            </div>

            <div class="campo">
                <label for="inicioMensalista">Data de início</label>
                <input type="date" id="inicioMensalista">
            </div>

            <div class="campo">
                <label for="fimMensalista">Data de término (opcional)</label>
                <input type="date" id="fimMensalista">
            </div>
        `;
    }
}

modalidadeMensalista.addEventListener(
    "change",
    atualizarConfiguracaoMensalista
);

function abrirCadastroMensalista(modalidade) {
    cadastroMensalista.hidden = false;
    modalidadeMensalista.value = modalidade;

    atualizarConfiguracaoMensalista();

    cadastroMensalista.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

btnHorariosRecorrentes.addEventListener("click", () => {
    abrirCadastroMensalista("fixo_recorrente");
});

btnPacotesMensais.addEventListener("click", () => {
    abrirCadastroMensalista("pacote_mensal");
});

btnCancelarCadastroMensalista.addEventListener("click", () => {
    cadastroMensalista.hidden = true;
    cadastroMensalista.querySelectorAll("input").forEach(campo => {
        campo.value = "";
    });

    modalidadeMensalista.value = "";
    configuracaoMensalista.replaceChildren();
});

/* ==========================
   15. Salvar Mensalista
========================== */

const btnSalvarMensalista = document.querySelector("#btnSalvarMensalista");

btnSalvarMensalista.addEventListener("click", async () => {

    const nome = document.querySelector("#nomeMensalista").value.trim();
    const telefone = document.querySelector("#telefoneMensalista").value.trim();
    const servico = document.querySelector("#servicoMensalista").value;
    const modalidade = modalidadeMensalista.value;

    const inicio = document.querySelector("#inicioMensalista")?.value;
    const fim = document.querySelector("#fimMensalista")?.value || null;

    const mensagemMensalista = document.querySelector("#mensagemMensalista");

    function exibirMensagemMensalista(texto, tipo) {
        mensagemMensalista.textContent = texto;
        mensagemMensalista.className = `mensagem ${tipo}`;
        mensagemMensalista.hidden = false;
    }

    // Validações gerais
    if (!nome || !telefone || !servico || !modalidade || !inicio) {
        exibirMensagemMensalista(
            "Preencha todos os campos obrigatórios.",
            "erro"
        );
        return;
    }

    if (fim && fim < inicio) {
        exibirMensagemMensalista(
            "A data de término não pode ser anterior à data de início.",
            "erro"
        );
        return;
    }

    // Dados que serão enviados ao Supabase
    const mensalista = {
        cliente: nome,
        telefone: telefone,
        servico: servico,
        modalidade: modalidade,
        data_inicio: inicio,
        data_fim: fim,
        status: "ativo"
    };

    // Configurações específicas de cada modalidade
    if (modalidade === "fixo_recorrente") {

        const diaSemana = document.querySelector("#diaSemanaMensalista").value;
        const horario = document.querySelector("#horarioMensalista").value;

        if (diaSemana === "" || !horario) {
            exibirMensagemMensalista(
                "Informe o dia da semana e o horário fixo.",
                "erro"
            );
            return;
        }

        mensalista.dia_semana = Number(diaSemana);
        mensalista.horario = horario;
    }

    if (modalidade === "pacote_mensal") {

        const tipo = document.querySelector("#tipoAgendamentoMensalista").value;
        const creditos = document.querySelector("#creditosMensalista").value;
        const regra = document.querySelector("#regraCreditosMensalista").value;

        if (!tipo || !creditos || Number(creditos) <= 0 || !regra) {
            exibirMensagemMensalista(
                "Informe o tipo de agendamento, os créditos e a regra.",
                "erro"
            );
            return;
        }

        mensalista.tipo_agendamento = tipo;
        mensalista.quantidade_creditos = Number(creditos);
        mensalista.regra_creditos = regra;
    }

    btnSalvarMensalista.disabled = true;
    btnSalvarMensalista.textContent = "Salvando...";

    const { error } = await supabaseClient
        .from("mensalistas")
        .insert([mensalista]);

    btnSalvarMensalista.disabled = false;
    btnSalvarMensalista.textContent = "Salvar mensalista";

    if (error) {
        console.error("Erro ao salvar mensalista:", error);

        exibirMensagemMensalista(
            "Não foi possível salvar. Verifique o cadastro e tente novamente.",
            "erro"
        );
        return;
    }

    exibirMensagemMensalista(
        "Mensalista cadastrado com sucesso!",
        "sucesso"
    );
    
    await carregarMensalistas();

    cadastroMensalista.querySelectorAll("input").forEach(campo => {
        campo.value = "";
    });

    modalidadeMensalista.value = "";
    configuracaoMensalista.replaceChildren();
});


/* ==========================
   16. Carregar e exibir Mensalistas
========================== */

async function carregarMensalistas() {
    const conteudo = document.querySelector("#conteudoMensalistas");

    if (!conteudo) return;

    conteudo.textContent = "Carregando mensalistas...";

    const { data, error } = await supabaseClient
        .from("mensalistas")
        .select("*")
        .order("cliente", { ascending: true });

    if (error) {
        console.error("Erro ao carregar mensalistas:", error);
        conteudo.textContent = "Não foi possível carregar os mensalistas.";
        return;
    }

    conteudo.replaceChildren();

    if (!data || data.length === 0) {
        conteudo.textContent = "Nenhum mensalista cadastrado.";
        return;
    }

    data.forEach(mensalista => {
        const card = document.createElement("article");
        card.className = "card-mensalista";

        const nome = document.createElement("h3");
        nome.textContent = mensalista.cliente;

        const telefone = document.createElement("p");
        telefone.textContent = `Telefone: ${mensalista.telefone}`;

        const servico = document.createElement("p");
        servico.textContent = `Serviço: ${mensalista.servico}`;

        const modalidade = document.createElement("p");
        modalidade.textContent =
            mensalista.modalidade === "fixo_recorrente"
                ? "Modalidade: Horário fixo recorrente"
                : "Modalidade: Pacote mensal";

        const inicio = document.createElement("p");
        inicio.textContent =
            `Início: ${formatarData(mensalista.data_inicio)}`;

        const termino = document.createElement("p");
        termino.textContent = mensalista.data_fim
            ? `Término: ${formatarData(mensalista.data_fim)}`
            : "Término: Sem data definida";

        const status = document.createElement("p");
        status.textContent = `Status: ${mensalista.status}`;

        card.append(
            nome,
            telefone,
            servico,
            modalidade
        );

        if (mensalista.modalidade === "fixo_recorrente") {
            const dias = [
                "Domingo",
                "Segunda-feira",
                "Terça-feira",
                "Quarta-feira",
                "Quinta-feira",
                "Sexta-feira",
                "Sábado"
            ];

            const dia = document.createElement("p");
            dia.textContent =
                `Dia: ${dias[mensalista.dia_semana] ?? "Não informado"}`;

            const horario = document.createElement("p");
            horario.textContent =
                `Horário: ${mensalista.horario || "Não informado"}`;

            card.append(dia, horario);
        }

        if (mensalista.modalidade === "pacote_mensal") {
            const tipo = document.createElement("p");
            tipo.textContent =
                `Agendamento: ${
                    mensalista.tipo_agendamento === "livre"
                        ? "Livre"
                        : "Definido"
                }`;

            const creditos = document.createElement("p");
            creditos.textContent =
                `Atendimentos por mês: ${mensalista.quantidade_creditos}`;

            const regra = document.createElement("p");
            regra.textContent =
                `Créditos: ${
                    mensalista.regra_creditos === "acumular"
                        ? "Acumulam para o próximo mês"
                        : "Expiram no final do mês"
                }`;

            card.append(tipo, creditos, regra);
        }

        card.append(inicio, termino, status);
        conteudo.appendChild(card);
    });
}

