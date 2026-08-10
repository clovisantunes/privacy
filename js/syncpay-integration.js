// =============================================
// SYNCPAY - INTEGRAÇÃO COMPLETA
// =============================================

// ===== INICIALIZAR =====
const syncpay = new SyncPay(SYNCPAY);

// ===== VARIÁVEIS =====
let planoSelecionado = { nome: 'Mensal', valor: 19.90 };

// ===== SELECIONAR PLANO =====
function selecionarPlano(nome, valor) {
    planoSelecionado = { nome, valor };

    document.querySelectorAll('.modal-compra-plan').forEach(btn => {
        btn.style.borderColor = '#e8e8e8';
        btn.style.background = 'white';
    });

    if (event && event.currentTarget) {
        event.currentTarget.style.borderColor = '#ff6542';
        event.currentTarget.style.background = '#fff8f5';
    }

    document.getElementById('btnPagar').textContent = `🔓 Pagar R$ ${valor.toFixed(2)}`;
    document.getElementById('btnPagar').disabled = false;
}

// ===== PROCESSAR PAGAMENTO =====
async function processarPagamento() {
    const nome = document.getElementById('inputNome').value.trim();
    const cpf = document.getElementById('inputCPF').value.trim();
    const email = document.getElementById('inputEmail').value.trim();
    const telefone = document.getElementById('inputTelefone').value.trim();

    // Validações
    if (!nome || nome.length < 3) {
        return alert('❌ Digite seu nome completo');
    }
    if (!validarCPF(cpf)) {
        return alert('❌ CPF inválido. Digite apenas números (11 dígitos)');
    }
    if (!email || !email.includes('@') || !email.includes('.')) {
        return alert('❌ E-mail inválido');
    }
    if (!telefone || telefone.length < 10 || telefone.length > 11) {
        return alert('❌ Telefone inválido. Digite com DDD (apenas números)');
    }

    const btn = document.getElementById('btnPagar');
    const mensagem = document.getElementById('mensagemStatus');

    btn.disabled = true;
    btn.textContent = '⏳ Gerando Pix...';
    mensagem.style.display = 'none';

    try {
        // GERA PIX
        const pix = await syncpay.gerarPix({
            valor: planoSelecionado.valor,
            descricao: `Plano ${planoSelecionado.nome} - maryy_velvet`,
            nomeCliente: nome,
            cpfCliente: cpf,
            emailCliente: email,
            telefoneCliente: telefone
        });

        // MOSTRA ÁREA DO PIX
        const areaPix = document.getElementById('areaPix');
        areaPix.style.display = 'block';

        // QR CODE
        const qrImg = document.getElementById('qrCodePix');
        syncpay.gerarQRCode(pix.pixCode, qrImg);

        // STATUS
        document.getElementById('statusPix').innerHTML = `
            ✅ Pix gerado!<br>
            <small>Valor: R$ ${pix.amount.toFixed(2)}</small>
        `;

        mensagem.style.display = 'block';
        mensagem.style.background = '#d4edda';
        mensagem.style.color = '#155724';
        mensagem.textContent = '✅ Pix gerado! Escaneie o QR Code ou copie o código.';

        btn.textContent = '⏳ Aguardando pagamento...';
        btn.style.background = '#ffc107';
        btn.style.color = '#333';

        // MONITORA PAGAMENTO
        syncpay.monitorarPagamento(pix.identifier, function(resposta) {
            if (resposta.success) {
                // PAGAMENTO CONFIRMADO!
                mensagem.style.background = '#d4edda';
                mensagem.style.color = '#155724';
                mensagem.textContent = '🎉 PAGAMENTO CONFIRMADO! Acesse seu conteúdo!';

                document.getElementById('statusPix').innerHTML = '✅ Pagamento aprovado!';
                btn.textContent = '✅ Aprovado!';
                btn.style.background = '#22c55e';
                btn.style.color = 'white';

                // LIBERA CONTEÚDO
                liberarConteudo();

                // FECHA MODAL DEPOIS
                setTimeout(() => {
                    fecharModalPagamento();
                    alert('🎉 PARABÉNS!\n\nSeu pagamento foi aprovado!\nConteúdo liberado com sucesso!');
                }, 2000);

            } else if (resposta.error) {
                mensagem.style.background = '#f8d7da';
                mensagem.style.color = '#721c24';
                mensagem.textContent = '❌ ' + resposta.error;

                btn.textContent = '🔓 Tentar novamente';
                btn.disabled = false;
                btn.style.background = 'linear-gradient(135deg, #ff6542, #ff4d1a)';
                btn.style.color = 'white';
            }
        });

    } catch (error) {
        mensagem.style.display = 'block';
        mensagem.style.background = '#f8d7da';
        mensagem.style.color = '#721c24';
        mensagem.textContent = '❌ ' + error.message;

        btn.textContent = '🔓 Tentar novamente';
        btn.disabled = false;
        btn.style.background = 'linear-gradient(135deg, #ff6542, #ff4d1a)';
        btn.style.color = 'white';
    }
}

// ===== COPIAR PIX =====
function copiarPix() {
    syncpay.copiarPix();
}

// ===== LIBERAR CONTEÚDO =====
function liberarConteudo() {
    // Remove blur
    document.querySelectorAll('.group').forEach(el => {
        el.classList.add('conteudo-liberado');
    });

    // Mostra botão Telegram
    const btnTelegram = document.getElementById('btnTelegram');
    if (btnTelegram) {
        btnTelegram.classList.add('visible');
    }

    // Salva no localStorage
    localStorage.setItem('maryyvelvet_pago', 'true');
    localStorage.setItem('maryyvelvet_data', new Date().toISOString());
}

// ===== VERIFICAR SE JÁ PAGOU =====
function verificarPagamentoExistente() {
    if (localStorage.getItem('maryyvelvet_pago') === 'true') {
        liberarConteudo();
        return true;
    }
    return false;
}

// ===== ABRIR MODAL =====
function abrirModal() {
    document.getElementById('modalPagamento').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ===== FECHAR MODAL =====
function fecharModalPagamento(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('modalPagamento').classList.remove('active');
    document.body.style.overflow = '';
    syncpay.pararMonitoramento();
}

// =============================================
// INICIALIZAR
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    // Verifica pagamento anterior
    verificarPagamentoExistente();

    // Máscaras
    document.getElementById('inputCPF').addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '');
    });
    document.getElementById('inputTelefone').addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '');
    });
});

// =============================================
// EXPORTAR FUNÇÕES GLOBAIS
// =============================================
window.abrirModal = abrirModal;
window.fecharModalPagamento = fecharModalPagamento;
window.selecionarPlano = selecionarPlano;
window.processarPagamento = processarPagamento;
window.copiarPix = copiarPix;