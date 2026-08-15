# Design: Onboarding de Primeiro Fluxo

## Decisão

Trocar a sequência de quatro telas de apresentação por uma única recepção
orientada a ação. Ela informa o próximo fluxo com três escolhas claras:

1. Começar pelo cliente, que abre o início real da jornada comercial.
2. Explorar um projeto de demonstração, criado apenas quando solicitado.
3. Conhecer a interface, que abre o tour contextual do dashboard.

O painel é uma superfície escura e compacta, centralizada em desktop e
ancorada ao rodapé em telas menores. Não há gradiente decorativo, lista de
recursos genéricos nem progresso artificial.

## Tour responsivo

O `ProductTour` conserva a ordem e o contexto dos passos existentes. Em
desktop, a explicação fica ao lado do alvo destacado. Em telas abaixo de
1024px, o alvo é trazido para a área visível e a explicação usa uma folha
inferior fixa. Isso evita tooltips sobrepostos a menus compactos, teclados e
áreas fora da tela.

Os passos são filtrados pelo papel do usuário antes de abrir o tour. O
estado de conclusão é gravado no `localStorage`; pular não reabre a
recepção, e finalizar não retorna ao modal anterior.

