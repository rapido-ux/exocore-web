// @ts-check

import axios, { AxiosResponse } from 'axios';
import fs from 'fs';
import path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';
import { Request, Response, Application } from 'express';
import { WebSocketServer } from 'ws';
import { Server as HttpServer } from 'http';

const TEMPLATE_URL = 'https://raw.githubusercontent.com/ChoruOfficial/global-exocore/main/template.json';
const configPath = path.resolve(__dirname, '../config.json');
const git: SimpleGit = simpleGit();

interface Template {
  id: string;
  name: string;
  description: string;
  image: string;
  git: string;
}

interface ConfigData {
  project?: string;
  [key: string]: any;
}

interface CreateProjectOptions {
  templateId?: string;
  gitUrl?: string;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.promises.access(p);
    return true;
  } catch {
    return false;
  }
}

const api = {
  async getTemplates(): Promise<Template[]> {
    try {
      const res: AxiosResponse<Template[]> = await axios.get(TEMPLATE_URL);
      if (Array.isArray(res.data)) return res.data;
      console.warn('Fetched template.json is not an array.');
      return [];
    } catch (err: unknown) {
      console.error('Failed to fetch templates:', err);
      return [];
    }
  },

  async updateConfig(projectName: string): Promise<void> {
    let config: ConfigData = {};
    try {
      if (await pathExists(configPath)) {
        const file = await fs.promises.readFile(configPath, 'utf-8');
        config = file.trim() ? JSON.parse(file) : {};
      }
    } catch (err) {
      console.error('Error reading config:', err);
    }

    config.project = `../${projectName}`;
    try {
      await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
      console.log(`Config updated: ${configPath}`);
    } catch (err) {
      console.error('Error writing config:', err);
    }
  },

  async cloneTemplate(gitUrl: string, targetPath: string): Promise<void> {
    try {
      await git.clone(gitUrl, targetPath);
      console.log('Cloned template successfully.');
    } catch (err) {
      console.error('Git clone failed:', err);
      throw new Error('Git clone failed');
    }
  },

  async checkProjectStatus(): Promise<{ exists: boolean }> {
    if (!await pathExists(configPath)) return { exists: false };
    try {
      const raw = await fs.promises.readFile(configPath, 'utf-8');
      const config: ConfigData = JSON.parse(raw);
      if (!config.project) return { exists: false };

      const folder = path.resolve(path.dirname(configPath), config.project);
      return { exists: await pathExists(folder) };
    } catch (err) {
      console.error('Error checking project status:', err);
      return { exists: false };
    }
  },

  async createProject(projectName: string, { templateId, gitUrl }: CreateProjectOptions): Promise<string> {
    if (!projectName.trim()) throw new Error('Project name is required.');

    let cloneUrl: string;

    if (gitUrl && templateId) throw new Error('Provide either a template ID or a Git URL, not both.');
    if (gitUrl) {
      cloneUrl = gitUrl;
    } else if (templateId) {
      const templates = await api.getTemplates();
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error(`Template "${templateId}" not found.`);
      cloneUrl = template.git;
    } else {
      throw new Error('You must provide a template ID or Git URL.');
    }

    const base = path.resolve(__dirname, '../..');
    const target = path.join(base, projectName);

    if (await pathExists(target)) {
      throw new Error(`Project "${projectName}" already exists.`);
    }

    await api.cloneTemplate(cloneUrl, target);
    await api.updateConfig(projectName);
    return `Project "${projectName}" created at ${target}`;
  },
};

interface ProjectRouteParams {
  req: Request;
  res: Response;
  app?: Application;
  wss?: WebSocketServer;
  wssConsole?: WebSocketServer;
  Shellwss?: WebSocketServer;
  server?: HttpServer;
}

interface ProjectExpressRouteModule {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'all';
  path: string;
  install: (params: any) => Promise<void> | void;
}

interface CreateProjectRequestBody {
  name: string;
  template?: string;
  gitUrl?: string;
}

export const modules: ProjectExpressRouteModule[] = [
  {
    method: 'post',
    path: '/templates',
    install: async ({ res }: Pick<ProjectRouteParams, 'res'>) => {
      try {
        const templates = await api.getTemplates();
        res.json(templates);
      } catch (err) {
        console.error('Error in /templates:', err);
        res.status(500).json({ error: 'Failed to load templates.' });
      }
    }
  },
  {
    method: 'post',
    path: '/project',
    install: async ({ req, res }: Pick<ProjectRouteParams, 'req' | 'res'>) => {
      const { name, template, gitUrl } = req.body as CreateProjectRequestBody;
      try {
        const msg = await api.createProject(name, { templateId: template, gitUrl });
        res.status(201).json({ success: true, message: msg, projectPath: name });
      } catch (err) {
        console.error('Project creation failed:', err);
        res.status(400).json({ success: false, error: (err as Error).message });
      }
    }
  },
  {
    method: 'post',
    path: '/project/status',
    install: async ({ res }: Pick<ProjectRouteParams, 'res'>) => {
      try {
        const status = await api.checkProjectStatus();
        res.json(status);
      } catch (err) {
        console.error('Error checking status:', err);
        res.status(500).json({ error: 'Unable to check project status.' });
      }
    }
  }
];
