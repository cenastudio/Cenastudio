# Storyboard IA conectado ao Shot List — Design

## Decisão principal

Storyboard IA é uma extensão do Shot List, não uma ferramenta separada. O ponto
de entrada primário fica em cada shot e a experiência secundária pode virar uma
aba "Storyboard" dentro da própria tela de Shot List quando houver volume.

## Modelo de dados proposto

Novo model `ShotStoryboardFrame`:

```prisma
model ShotStoryboardFrame {
  id            BigInt   @id @default(autoincrement())
  userId        BigInt   @map("user_id")
  projectId     BigInt   @map("project_id")
  shotId        BigInt   @map("shot_id")
  prompt        String
  finalPrompt   String   @map("final_prompt")
  provider      String
  model         String?
  imageUrl      String?  @map("image_url")
  storagePath   String?  @map("storage_path")
  status        String   @default("queued")
  errorMessage  String?  @map("error_message")
  revision      Int      @default(1)
  approvedAt    DateTime? @map("approved_at") @db.Timestamptz
  approvedById  BigInt?  @map("approved_by_id")
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime @default(now()) @map("updated_at") @db.Timestamptz

  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  project    Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  shot       Shot    @relation(fields: [shotId], references: [id], onDelete: Cascade)
  approvedBy User?   @relation("ShotStoryboardApproval", fields: [approvedById], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([projectId])
  @@index([shotId])
  @@map("shot_storyboard_frames")
}
```

Status permitidos no service:

- `queued`
- `generating`
- `generated`
- `approved`
- `failed`

## Backend

Rotas sob `/api/shotlists` para manter a descoberta:

```text
GET  /shotlists/shots/:id/storyboard
POST /shotlists/shots/:id/storyboard/generate
POST /shotlists/storyboard/:frameId/approve
DELETE /shotlists/storyboard/:frameId
```

Service novo:

```text
server/services/shotStoryboardService.ts
```

Responsabilidades:

- validar ownership via shot -> shotList -> user;
- montar prompt final;
- chamar `imageGenerationService`;
- salvar frame e erro;
- aprovar frame e atualizar `shots.thumbnail_url`;
- nunca apagar revisões antigas ao aprovar uma nova.

Adapter:

```text
server/services/imageGenerationService.ts
```

Interface mínima:

```ts
type GenerateImageInput = {
  prompt: string;
  style: "storyboard-pencil";
  aspectRatio: "16:9" | "4:3" | "1:1";
};

type GenerateImageResult = {
  imageBuffer?: Buffer;
  imageUrl?: string;
  provider: string;
  model?: string;
};
```

## Storage

Preferência: Supabase Storage.

Caminho sugerido:

```text
storyboards/user-{userId}/project-{projectId}/shot-{shotId}/frame-{frameId}.png
```

Enquanto Supabase Storage não estiver pronto, o adapter pode aceitar URL remota
do provider, mas isso deve ser tratado como transitório no STATUS.

## Frontend

Superfícies:

- Card/linha do shot: botão de ação visual quando não há frame aprovado.
- Dialog `StoryboardFrameDialog`: prompt, estilo fixo do MVP, gerar, aprovar,
  substituir thumbnail.
- Visualização compacta: thumbnail aprovada no row, histórico em dialog.

UX mobile:

- Botão em ícone com tooltip no desktop e label curta no mobile quando couber.
- Dialog full-height no mobile, imagem com aspect-ratio fixo e ações sticky no
  rodapé.
- Nenhum carrossel horizontal obrigatório.

## Segurança

- Auth obrigatória.
- Gate Pro+ via `requireStudioPlan("shotList")`.
- Todas as queries filtram por `userId`.
- Prompt não pode receber HTML executável.
- Erro do provider não deve vazar secret, request ID privado ou stack trace.

## Observabilidade

Registrar provider, modelo, status e erro sanitizado no frame. Logs server-side
podem conter ID do frame, userId e provider, mas nunca prompt com dados sensíveis
em nível info por padrão.
