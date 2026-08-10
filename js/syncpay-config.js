// =============================================
// SYNCPAY - CONFIGURAÇÃO
// =============================================

const SYNCPAY = {
    // ✅ URL CORRETA DA API
    baseURL: 'https://api.syncpayments.com.br',
    
    // ⚠️ SUBSTITUA PELOS SEUS DADOS
    token: 'SEU_TOKEN_BEARER_AQUI',
    userId: 'SEU_USER_ID_AQUI',
    webhookUrl: 'https://seusite.com/webhook-pix'
};

// =============================================
// CLASS SYNCPAY
// =============================================
class SyncPay {
    constructor(config) {
        this.config = config;
        this.transaction = null;
        this.monitor = null;
    }

    // ===== GERAR PIX =====
    async gerarPix(dados) {
        try {
            const url = `${this.config.baseURL}/api/partner/v1/cash-in`;
            console.log('📍 URL:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.config.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: dados.valor,
                    description: dados.descricao || 'Conteúdo exclusivo',
                    webhook_url: dados.webhookUrl || this.config.webhookUrl,
                    client: {
                        name: dados.nomeCliente,
                        cpf: dados.cpfCliente.replace(/\D/g, ''),
                        email: dados.emailCliente,
                        phone: dados.telefoneCliente.replace(/\D/g, '')
                    },
                    split: [{
                        percentage: 100,
                        user_id: this.config.userId
                    }]
                })
            });

            const resultado = await response.json();

            if (!response.ok) {
                throw new Error(resultado.message || 'Erro ao gerar Pix');
            }

            this.transaction = {
                identifier: resultado.identifier,
                pixCode: resultado.pix_code,
                amount: dados.valor
            };

            console.log('✅ Pix gerado:', this.transaction);
            return this.transaction;

        } catch (error) {
            console.error('❌ Erro:', error);
            throw error;
        }
    }

    // ===== VERIFICAR STATUS =====
    async verificarStatus(identifier) {
        try {
            const url = `${this.config.baseURL}/api/partner/v1/transaction-status/${identifier}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.config.token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) return null;
            return await response.json();

        } catch (error) {
            console.error('❌ Erro ao verificar:', error);
            return null;
        }
    }

    // ===== MONITORAR PAGAMENTO =====
    monitorarPagamento(identifier, callback) {
        let tentativas = 0;
        const maxTentativas = 60; // 5 minutos

        if (this.monitor) {
            clearInterval(this.monitor);
            this.monitor = null;
        }

        this.monitor = setInterval(async () => {
            tentativas++;
            console.log(`🔄 Verificando (${tentativas}/${maxTentativas})...`);

            const status = await this.verificarStatus(identifier);

            if (status && status.status === 'paid') {
                clearInterval(this.monitor);
                this.monitor = null;
                console.log('✅ Pagamento confirmado!');
                callback({ success: true, status });
                return;
            }

            if (tentativas >= maxTentativas) {
                clearInterval(this.monitor);
                this.monitor = null;
                console.log('⏱️ Tempo excedido');
                callback({ success: false, error: 'Tempo de pagamento excedido' });
            }
        }, 5000);
    }

    // ===== COPIAR PIX =====
    copiarPix() {
        if (!this.transaction?.pixCode) {
            alert('❌ Nenhum Pix gerado!');
            return;
        }

        const code = this.transaction.pixCode;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(code)
                .then(() => alert('✅ Código Pix copiado!'))
                .catch(() => this._copiarFallback(code));
        } else {
            this._copiarFallback(code);
        }
    }

    _copiarFallback(code) {
        const input = document.createElement('input');
        input.value = code;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        alert('✅ Código Pix copiado!');
    }

    // ===== GERAR QR CODE =====
    gerarQRCode(pixCode, elemento) {
        const url = `https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(pixCode)}&chs=250x250&choe=UTF-8`;
        if (elemento) {
            elemento.src = url;
            elemento.style.display = 'block';
        }
        return url;
    }

    // ===== PARAR MONITORAMENTO =====
    pararMonitoramento() {
        if (this.monitor) {
            clearInterval(this.monitor);
            this.monitor = null;
        }
    }
}

// =============================================
// VALIDAR CPF
// =============================================
function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(10))) return false;

    return true;
}