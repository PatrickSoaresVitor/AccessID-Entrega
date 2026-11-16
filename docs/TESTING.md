# Qualidade do AccessID

Use Node 24 LTS e, em um checkout novo, `npm ci`. As ferramentas de teste são dependências de desenvolvimento.

| Quando | Comando | Evidência |
| --- | --- | --- |
| Ao alterar um fluxo | `npm test -- registrar` (ou `database`, `sync`) | Executa a suíte selecionada |
| Durante o desenvolvimento | `npm run quality:fast` | ESLint, TypeScript e todas as suítes Jest |
| Antes da integração | `npm run quality` | Verificações rápidas seguidas da exportação Android de produção pelo Metro/Hermes |
| Na validação de versão | `npm run test:e2e` | Maestro opera o APK QA em Android |

Para investigar isoladamente, use `npm run lint`, `npm run typecheck`, `npm test` ou `npm run check:android`. O GitHub Actions executa o comando completo em pushes e pull requests. O bundle de validação fica em uma pasta temporária identificada na saída. O teste de instalação nativa requer um APK.

## O que as suítes exercitam

- **Banco e sessão.** Executam as funções da aplicação contra SQLite em memória via `node:sqlite`. Cobrem matrícula única, autenticação, mudança de status e PIN, administração, alternância diária, presença, histórico e conversão de dados legados. O adaptador de criptografia usa os algoritmos do Node.
- **Sincronização.** Exercita a rotina real com conectividade controlada e tabelas remotas em memória. Verifica download para SQLite vazio, integridade de hashes e UUIDs, reenvio de dados divergentes, chamadas concorrentes, erro e nova tentativa.
- **Interface.** Renderiza a tela real de registro com o preset Android e React Native Testing Library. Verifica identificação, cancelamento, confirmação, rejeição de PIN inválido e o registro efetivo em SQLite.
- **Isolamento.** Os dados são sintéticos. O Jest bloqueia fetch, e o bundle usa variáveis fictícias e desabilita a leitura do dotenv. Políticas RLS, constraints PostgreSQL, relógio do dispositivo e comportamento do módulo nativo exigem validações próprias.

## Regressões e linha de base

Na auditoria dos registros, confira também o status local após o envio. Um UUID ausente na releitura do Supabase ou com campos divergentes deve continuar pendente. A suíte `sync` simula os dois casos e verifica que uma nova tentativa confirma os mesmos UUIDs sem duplicar marcações.

Sempre que viável, reproduza o defeito em um teste que falhe na revisão anterior. Verifique a falha esperada, aplique a menor correção e rode a suíte focada e o comando completo. Para interfaces compartilhadas, cubra também consumidores e dados antigos. Registre comandos executados, resultado e qualquer validação pendente.

O ESLint aceita quatro ocorrências legadas de `react-hooks/set-state-in-effect`, uma por tela registrada em `eslint-suppressions.json`. Ele bloqueia aumentos por arquivo e avisos novos. Ao corrigir uma ocorrência, reduza a contagem correspondente. Não amplie a linha de base para aprovar alterações.

## E2E de versão no Android

Para testar o gerador offline, abra **Área administrativa → Gerenciar funcionários → Gerar QR Code**. Selecione um funcionário ativo e confira o nome e a matrícula no crachá. Em outro aparelho de QA que tenha a mesma matrícula ativa, leia o código e confira a identificação antes de confirmar. A suíte `crachas` cobre proteção da aba, seleção, exclusão dos inativos e conteúdo enviado ao gerador.

Para o aceite óptico, use um novo APK com o módulo nativo de câmera e um crachá de teste contendo `ACCESSID:QA01`. Com o aparelho offline, abra **Escanear crachá**, permita a câmera, leia, cancele e confira o histórico. Repita e confirme uma entrada e uma saída. Verifique o método QRCODE e a situação pendente no histórico. No perfil QA o endpoint é fictício; a validação do envio real exige uma instalação de homologação. Jest simula os eventos da câmera e executa a gravação em SQLite em memória.

1. Prepare um Android de QA com ADB e Maestro CLI disponíveis. Para gerar o APK interno, use `npx eas-cli@latest build -p android --profile e2e` em ambiente autorizado para builds. O perfil usa configurações fictícias e instala o pacote `com.pablovitor.accessid.qa` em paralelo ao aplicativo normal.
2. Instale o APK QA, crie o administrador local e cadastre um funcionário sintético ativo de matrícula `QA01` e PIN `1234`. Saia do painel e deixe o dispositivo na tela inicial do AccessID QA. Deixe a rede offline. O fluxo espera que a próxima marcação seja entrada.
3. Execute `npm run test:e2e`. O roteiro identifica o funcionário, confirma a entrada e verifica que a próxima operação é saída, confirmando-a também. A dupla completa pode ser repetida. Se uma execução for interrompida após a entrada, complete a saída pelo app QA antes da nova tentativa.
4. Para validar o SDK nativo e a distribuição, registre versão do APK, modelo do aparelho, versão do Android e resultado. Valide políticas remotas separadamente em uma instância descartável de homologação.

## Estado dos aceites

Os fluxos de leitura e geração de crachás estão implementados no cliente. O aceite óptico Android e a conciliação em homologação devem ser registrados após execução em aparelho; os testes simulados não os substituem. Para o teste óptico, abra o [crachá sintético QA01](cracha-qa01.png) em outra tela e mantenha a matrícula QA01 ativa no aparelho leitor. O QR preserva a matrícula exata, inclusive zeros à esquerda, e não contém o PIN.
