import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-3xl"
      >
        <h1 className="text-5xl md:text-7xl font-black text-gradient-primary mb-4 leading-tight">
          SpliceMetrics
        </h1>
        <p className="text-lg text-muted-foreground mb-12">
          Plataforma unificada de análise de desempenho e classificação de infrações
        </p>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <Link to="/classificacao">
            <motion.div
              whileHover={{ scale: 1.03, y: -4 }}
              className="card-glass rounded-2xl p-8 text-left group cursor-pointer transition-all hover:border-neon-purple/40"
            >
              <AlertTriangle className="w-10 h-10 text-neon-purple mb-4" />
              <h2 className="text-xl font-bold mb-2">Classificação de Infrações</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Análise detalhada de infrações inválidas por motivo, responsabilidade Splice/DER e rankings.
              </p>
              <span className="text-xs text-neon-purple flex items-center gap-1 group-hover:gap-2 transition-all">
                Acessar módulo <ArrowRight className="w-3 h-3" />
              </span>
            </motion.div>
          </Link>

          <Link to="/indices">
            <motion.div
              whileHover={{ scale: 1.03, y: -4 }}
              className="card-glass rounded-2xl p-8 text-left group cursor-pointer transition-all hover:border-primary/40"
            >
              <BarChart3 className="w-10 h-10 text-primary mb-4" />
              <h2 className="text-xl font-bold mb-2">Análise de Índices (ID)</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Monitoramento de ID, IEF, ICV, IDF com impacto financeiro e visão executiva.
              </p>
              <span className="text-xs text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                Acessar módulo <ArrowRight className="w-3 h-3" />
              </span>
            </motion.div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Index;
