-- OPCIONAL: serviços iniciais para começar mais rápido.
-- Ajuste nomes e preços (ou cadastre tudo pelo painel em /admin/servicos).
-- Não cria nenhum agendamento.

insert into public.services (name, description, price, sort_order) values
  ('Corte masculino', 'Corte na tesoura e/ou máquina com finalização', 70.00, 0),
  ('Corte feminino',  'Corte com lavagem e finalização',               80.00, 1),
  ('Corte infantil',  'Para crianças até 12 anos',                     70.00, 2);
