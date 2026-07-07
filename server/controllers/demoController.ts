import type { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import type { DbProject } from "../models/types.js";

/**
 * Create demo client and project for first-time users
 * This helps with onboarding by providing a fully-configured example
 */
export const createDemoProject: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Check if demo project already exists
    const existingDemo = shouldUsePrisma
      ? await prisma.project.findFirst({
          where: {
            userId: BigInt(userId),
            name: "Comercial de Lançamento - Demo",
          },
        })
      : db
          .prepare("SELECT id FROM projects WHERE user_id = ? AND name = ?")
          .get(userId, "Comercial de Lançamento - Demo");

    if (existingDemo) {
      return res.json({
        success: true,
        message: "Projeto demo já existe",
        data: { alreadyExists: true },
      });
    }

    // 1. Create demo client
    const demoClientData = {
      name: "Maria Silva",
      company: "Demo Inc.",
      email: "maria@demoinc.com.br",
      phone: "+55 11 98765-4321",
      segment: "Tecnologia",
      status: "active",
      workflowStage: "active_client",
      notes: "Cliente de demonstração criado automaticamente para você explorar a plataforma. Sinta-se à vontade para editar ou deletar.",
      address: "Av. Paulista, 1000 - São Paulo, SP",
      city: "São Paulo",
      state: "SP",
      country: "Brasil",
      website: "https://demoinc.com.br",
      industry: "Software",
      companySize: "50-200",
      contactPerson: "Maria Silva",
      contactRole: "Diretora de Marketing",
    };

    let demoClient: any;

    if (shouldUsePrisma) {
      demoClient = await prisma.client.create({
        data: {
          userId: BigInt(userId),
          ...demoClientData,
        },
      });
    } else {
      const stmt = db.prepare(`
        INSERT INTO clients (
          user_id, name, company, email, phone, segment, status, workflow_stage,
          notes, address, city, state, country, website, industry, company_size,
          contact_person, contact_role, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          datetime('now'), datetime('now')
        )
      `);

      const result = stmt.run(
        userId,
        demoClientData.name,
        demoClientData.company,
        demoClientData.email,
        demoClientData.phone,
        demoClientData.segment,
        demoClientData.status,
        demoClientData.workflowStage,
        demoClientData.notes,
        demoClientData.address,
        demoClientData.city,
        demoClientData.state,
        demoClientData.country,
        demoClientData.website,
        demoClientData.industry,
        demoClientData.companySize,
        demoClientData.contactPerson,
        demoClientData.contactRole,
      );

      demoClient = {
        id: Number(result.lastInsertRowid),
        ...demoClientData,
      };
    }

    // 2. Create demo project with complete metadata
    const projectMetadata = {
      isDemo: true,
      isPinned: true,
      projectType: "Comercial",
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      objective:
        "Criar um vídeo comercial de 60 segundos para o lançamento do novo produto SaaS da Demo Inc. O vídeo deve destacar os principais benefícios da plataforma e gerar interesse em uma demo gratuita.",
      workflowFocus: "briefing",
      workflowStage: "pre_production",
      creativeGoals: {
        format: "Vídeo Comercial 60s",
        client: "Demo Inc.",
        tone: "Profissional e inspirador",
        cameraModel: "Sony A7S III",
        budget: "R$ 25.000",
        targetAudience: "Empresas de médio porte (50-200 funcionários)",
        deliverables: "1 vídeo master + 3 cortes para redes sociais",
        references: "Comerciais de SaaS modernos, estilo Apple/Google",
      },
    };

    const demoProjectData = {
      name: "Comercial de Lançamento - Demo",
      description:
        "Projeto de demonstração completo com briefing, roteiro inicial e todas as informações necessárias. Use este projeto para explorar todas as funcionalidades da plataforma.",
      status: "active",
      metadataJson: JSON.stringify(projectMetadata),
    };

    let demoProject: any;

    if (shouldUsePrisma) {
      demoProject = await prisma.project.create({
        data: {
          userId: BigInt(userId),
          clientId: demoClient.id,
          ...demoProjectData,
        },
      });
    } else {
      const stmt = db.prepare(`
        INSERT INTO projects (
          user_id, client_id, name, description, status, metadata_json,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
        )
      `);

      const result = stmt.run(
        userId,
        Number(demoClient.id),
        demoProjectData.name,
        demoProjectData.description,
        demoProjectData.status,
        demoProjectData.metadataJson,
      );

      demoProject = {
        id: Number(result.lastInsertRowid),
        ...demoProjectData,
        clientId: Number(demoClient.id),
      };
    }

    // 3. Create initial briefing document in tools_usage (optional)
    const briefingContent = `
# Briefing - Comercial de Lançamento Demo Inc.

## Cliente
**Demo Inc.** - Empresa de software B2B

## Objetivo
Criar vídeo comercial de 60 segundos para lançamento do novo produto SaaS.

## Público-Alvo
Empresas de médio porte (50-200 funcionários) que buscam otimizar processos.

## Tom & Estilo
- Profissional e inspirador
- Moderno e clean
- Referências: comerciais Apple, Google, Slack

## Mensagem Principal
"Simplifique sua operação, multiplique seus resultados"

## Deliverables
1. Vídeo master 60s (1920x1080)
2. Corte 30s (Instagram/Facebook)
3. Corte 15s (Stories)
4. Corte 6s (bumper YouTube)

## Budget
R$ 25.000 (produção completa)

## Prazo
30 dias a partir de hoje

## Próximos Passos
1. Aprovar briefing
2. Desenvolver roteiro criativo
3. Criar storyboard
4. Agendar callsheet
5. Produção e pós-produção
`.trim();

    // Nota: o registro de uso da ferramenta de briefing (tools_usage) foi
    // desabilitado porque a tabela/model correspondente não existe no schema
    // atual (Prisma nem SQLite). O conteúdo de briefingContent permanece
    // disponível caso essa funcionalidade seja implementada no futuro.
    void briefingContent;

    res.json({
      success: true,
      message: "Projeto demo criado com sucesso! 🎬",
      data: {
        client: {
          id: Number(demoClient.id),
          name: demoClientData.name,
          company: demoClientData.company,
        },
        project: {
          id: Number(demoProject.id),
          name: demoProjectData.name,
          description: demoProjectData.description,
        },
      },
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Check if demo project exists for current user
 */
export const checkDemoProject: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const demoProject = shouldUsePrisma
      ? await prisma.project.findFirst({
          where: {
            userId: BigInt(userId),
            name: "Comercial de Lançamento - Demo",
          },
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
          },
        })
      : (db
          .prepare(
            "SELECT id, name, description, status FROM projects WHERE user_id = ? AND name = ?",
          )
          .get(userId, "Comercial de Lançamento - Demo") as
          | Pick<DbProject, "id" | "name" | "description" | "status">
          | undefined);

    res.json({
      success: true,
      data: {
        exists: !!demoProject,
        project: demoProject
          ? {
              id: Number(demoProject.id),
              name: demoProject.name,
              description: demoProject.description,
              status: demoProject.status,
            }
          : null,
      },
    });
  } catch (e) {
    next(e);
  }
};
