import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TransactionCategory = {
  id: number;
  value: string;
  label_es: string;
  label_en: string;
  type: 'expense' | 'income';
  sort_order: number;
  is_active: boolean;
  // Hierarchy fields
  parent_id?: number | null;
  level?: number;
  hierarchy_path?: string | null;
};

export type HierarchicalCategory = TransactionCategory & {
  children: HierarchicalCategory[];
  fullPath: string;
};

// Build hierarchical tree from flat list
const buildCategoryTree = (categories: TransactionCategory[]): HierarchicalCategory[] => {
  const map = new Map<number, HierarchicalCategory>();
  const roots: HierarchicalCategory[] = [];

  // First pass: create map and add children array
  categories.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [], fullPath: '' });
  });

  // Second pass: build tree
  categories.forEach((cat) => {
    const node = map.get(cat.id)!;
    if (cat.parent_id && map.has(cat.parent_id)) {
      const parent = map.get(cat.parent_id)!;
      parent.children.push(node);
      node.fullPath = `${parent.label_es} > ${cat.label_es}`;
    } else {
      roots.push(node);
      node.fullPath = cat.label_es;
    }
  });

  // Sort children by sort_order
  const sortChildren = (nodes: HierarchicalCategory[]) => {
    nodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    nodes.forEach((node) => sortChildren(node.children));
  };

  sortChildren(roots);
  return roots;
};

// Flatten tree to list with indentation info
const flattenTree = (
  tree: HierarchicalCategory[],
  result: (TransactionCategory & { indent: number; fullPath: string })[] = [],
  indent = 0
): (TransactionCategory & { indent: number; fullPath: string })[] => {
  tree.forEach((node) => {
    result.push({ ...node, indent, fullPath: node.fullPath });
    if (node.children.length > 0) {
      flattenTree(node.children, result, indent + 1);
    }
  });
  return result;
};

export const useTransactionCategories = (type?: 'expense' | 'income') => {
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from('transaction_categories')
          .select('*')
          .eq('is_active', true)
          .order('level', { ascending: true })
          .order('sort_order', { ascending: true });

        if (type) {
          query = query.eq('type', type);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setCategories(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching transaction categories:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [type]);

  // Build hierarchical structure
  const hierarchicalCategories = useMemo(() => {
    return buildCategoryTree(categories);
  }, [categories]);

  // Flattened list with indentation for dropdowns
  const flatCategories = useMemo(() => {
    return flattenTree(hierarchicalCategories);
  }, [hierarchicalCategories]);

  // Get only root categories (for when you want top-level only)
  const rootCategories = useMemo(() => {
    return categories.filter((c) => !c.parent_id || c.level === 0);
  }, [categories]);

  return {
    categories,
    hierarchicalCategories,
    flatCategories,
    rootCategories,
    loading,
    error
  };
};

// Hook para obtener una categoría específica por ID
export const useTransactionCategory = (categoryId?: number) => {
  const [category, setCategory] = useState<TransactionCategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoryId) {
      setCategory(null);
      setLoading(false);
      return;
    }

    const fetchCategory = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('transaction_categories')
          .select('*')
          .eq('id', categoryId)
          .single();

        if (error) throw error;

        setCategory(data);
      } catch (err) {
        console.error('Error fetching category:', err);
        setCategory(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [categoryId]);

  return { category, loading };
};
